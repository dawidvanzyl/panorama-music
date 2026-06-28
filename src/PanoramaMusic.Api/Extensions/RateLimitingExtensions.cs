using PanoramaMusic.Api.Configurations;
using PanoramaMusic.Api.Middleware;
using System.Threading.RateLimiting;

namespace PanoramaMusic.Api.Extensions;

public static class RateLimitingExtensions
{
	/// <summary>
	/// Registers a global limiter that enforces independent per-IP and per-account fixed-window
	/// limits on the sensitive auth endpoints, plus a per-token limit on <c>/refresh</c> and
	/// <c>/reset-password</c> (which are keyed by an opaque token rather than an email). Other
	/// routes pass through unaffected.
	/// </summary>
	public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services, IConfiguration configuration)
	{
		var options = configuration.GetSection(AuthRateLimitOptions.SectionName).Get<AuthRateLimitOptions>()
			?? throw new InvalidOperationException($"'{AuthRateLimitOptions.SectionName}' is not configured.");

		services.AddRateLimiter(limiterOptions =>
		{
			limiterOptions.OnRejected = (context, _) =>
			{
				context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
				return ValueTask.CompletedTask;
			};

			limiterOptions.GlobalLimiter = PartitionedRateLimiter.CreateChained(
				CreateIpLimiter(options),
				CreateAccountLimiter(options),
				CreateTokenLimiter(options));
		});

		return services;
	}

	private static PartitionedRateLimiter<HttpContext> CreateIpLimiter(AuthRateLimitOptions options)
	{
		return CreateLimiter(
			"ip",
			options.IpPermitLimit,
			options.WindowSeconds,
			IsAccountKeyedEndpoint,
			httpContext => httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
	}

	private static PartitionedRateLimiter<HttpContext> CreateAccountLimiter(AuthRateLimitOptions options)
	{
		return CreateLimiter(
			"account",
			options.AccountPermitLimit,
			options.WindowSeconds,
			IsAccountKeyedEndpoint,
			httpContext => GetItem(httpContext, RateLimitingAccountKeyMiddleware.AccountKeyItem));
	}

	private static PartitionedRateLimiter<HttpContext> CreateTokenLimiter(AuthRateLimitOptions options)
	{
		return CreateLimiter(
			"token",
			options.AccountPermitLimit,
			options.WindowSeconds,
			IsTokenKeyedEndpoint,
			httpContext => GetItem(httpContext, RateLimitingAccountKeyMiddleware.TokenKeyItem));
	}

	private static PartitionedRateLimiter<HttpContext> CreateLimiter(
		string dimension,
		int permitLimit,
		int windowSeconds,
		Func<HttpContext, bool> appliesTo,
		Func<HttpContext, string> resolveKey) =>
		PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
		{
			if (!appliesTo(httpContext))
			{
				return RateLimitPartition.GetNoLimiter(string.Empty);
			}

			var key = $"{httpContext.Request.Path}:{dimension}:{resolveKey(httpContext)}";

			return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
			{
				PermitLimit = permitLimit,
				Window = TimeSpan.FromSeconds(windowSeconds),
				QueueLimit = 0,
			});
		});

	private static bool IsAccountKeyedEndpoint(HttpContext httpContext) =>
		HttpMethods.IsPost(httpContext.Request.Method) && RateLimitedAuthPaths.AccountKeyed.Contains(httpContext.Request.Path.Value ?? string.Empty);

	private static bool IsTokenKeyedEndpoint(HttpContext httpContext) =>
		HttpMethods.IsPost(httpContext.Request.Method) && RateLimitedAuthPaths.TokenKeyed.Contains(httpContext.Request.Path.Value ?? string.Empty);

	private static string GetItem(HttpContext httpContext, string itemKey) =>
		httpContext.Items.TryGetValue(itemKey, out var value) && value is string stringValue
			? stringValue
			: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
}