namespace PanoramaMusic.Api.Middleware;

public sealed class SecurityHeadersMiddleware
{
	private readonly RequestDelegate _next;

	public SecurityHeadersMiddleware(RequestDelegate next)
	{
		_next = next;
	}

	public async Task InvokeAsync(HttpContext context)
	{
		context.Response.OnStarting(() =>
		{
			var headers = context.Response.Headers;

			headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
			headers["X-Content-Type-Options"] = "nosniff";
			headers["Referrer-Policy"] = "no-referrer";
			headers["Content-Security-Policy"] = "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'";

			if (context.GetEndpoint()?.Metadata.GetMetadata<SensitiveResponseMetadata>() is not null)
			{
				headers["Cache-Control"] = "no-store";
			}

			return Task.CompletedTask;
		});

		await _next(context);
	}
}