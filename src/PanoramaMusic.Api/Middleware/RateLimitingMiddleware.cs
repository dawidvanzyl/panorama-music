using PanoramaMusic.Api.Configurations;
using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Identity.Application.Services.Auth;
using System.Text.Json;

namespace PanoramaMusic.Api.Middleware;

/// <summary>
/// Pre-reads the request body for the rate-limited auth endpoints and stashes rate-limiting
/// keys in <see cref="HttpContext.Items"/>, since the rate limiter middleware runs before model
/// binding and cannot read the body (or resolve a token to its owning account) itself.
/// </summary>
public sealed class RateLimitingMiddleware(RequestDelegate next)
{
	public const string AccountKeyItem = "RateLimiting:AccountKey";
	public const string TokenKeyItem = "RateLimiting:TokenKey";

	public async Task InvokeAsync(HttpContext context, RateLimitTokenService rateLimitTokenService)
	{
		var path = context.Request.Path.Value ?? string.Empty;

		if (HttpMethods.IsPost(context.Request.Method) && RateLimitedAuthPaths.AccountKeyed.Contains(path))
		{
			// A client IP is the fallback identity whenever the request body doesn't yield a
			// usable key (missing/malformed field). Falling back to a constant like "unknown"
			// would let unrelated clients collide into one shared bucket.
			var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

			if (RateLimitedAuthPaths.TokenKeyed.Contains(path))
			{
				// /api/auth/refresh's token now travels as an HttpOnly cookie rather than in the
				// body (see RefreshTokenCookieExtensions); reset-password's token is unrelated and
				// still arrives in the body.
				var rawToken = string.Equals(path, "/api/auth/refresh", StringComparison.OrdinalIgnoreCase)
					? context.Request.GetRefreshTokenCookie()
					: await ExtractFieldAsync(context.Request, "token");
				context.Items[TokenKeyItem] = rawToken ?? ip;
				context.Items[AccountKeyItem] = rawToken is null
					? ip
					: await ResolveAccountKeyAsync(context, path, rawToken, rateLimitTokenService);
			}
			else
			{
				var email = await ExtractFieldAsync(context.Request, "email");
				context.Items[AccountKeyItem] = email ?? ip;
			}
		}

		await next(context);
	}

	private static async Task<string> ResolveAccountKeyAsync(
		HttpContext context,
		string path,
		string rawToken,
		RateLimitTokenService rateLimitTokenService)
	{
		var userId = string.Equals(path, "/api/auth/refresh", StringComparison.OrdinalIgnoreCase)
			? await rateLimitTokenService.GetRefreshTokenAccountAsync(rawToken, context.RequestAborted)
			: await rateLimitTokenService.GetPasswordResetTokenAccountAsync(rawToken, context.RequestAborted);

		// An unresolvable token still discriminates by the token text itself, so distinct
		// invalid tokens don't collide into one shared bucket either.
		return userId?.ToString() ?? rawToken;
	}

	private static async Task<string?> ExtractFieldAsync(HttpRequest request, string propertyName)
	{
		request.EnableBuffering();

		try
		{
			using var document = await JsonDocument.ParseAsync(request.Body, cancellationToken: request.HttpContext.RequestAborted);

			if (TryGetCaseInsensitiveString(document.RootElement, propertyName, out var value))
			{
				return propertyName == "email" ? value.Trim().ToLowerInvariant() : value;
			}
		}
		catch (JsonException)
		{
			// Malformed body; the downstream validation filter will reject the request.
		}
		finally
		{
			request.Body.Position = 0;
		}

		return null;
	}

	private static bool TryGetCaseInsensitiveString(JsonElement root, string propertyName, out string value)
	{
		if (root.ValueKind == JsonValueKind.Object)
		{
			foreach (var property in root.EnumerateObject())
			{
				if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase) && property.Value.ValueKind == JsonValueKind.String)
				{
					value = property.Value.GetString()!;
					return true;
				}
			}
		}

		value = string.Empty;
		return false;
	}
}