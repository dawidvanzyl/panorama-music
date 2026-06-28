namespace PanoramaMusic.Api.Middleware;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
	public async Task InvokeAsync(HttpContext context)
	{
		context.Response.OnStarting(() =>
		{
			var headers = context.Response.Headers;

			headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
			headers["X-Content-Type-Options"] = "nosniff";
			headers["Referrer-Policy"] = "no-referrer";
			headers["Content-Security-Policy"] = "default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com";

			if (context.Response.ContentType?.StartsWith("text/html", StringComparison.OrdinalIgnoreCase) == true)
			{
				headers["Cross-Origin-Opener-Policy"] = "same-origin";
			}

			if (context.GetEndpoint()?.Metadata.GetMetadata<SensitiveResponseMetadata>() is not null)
			{
				headers["Cache-Control"] = "no-store";
			}

			return Task.CompletedTask;
		});

		await next(context);
	}
}