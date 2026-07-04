namespace PanoramaMusic.Api.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
	public const string HeaderName = "X-Correlation-ID";
	public const string ItemKey = "CorrelationId";

	// Caller-supplied values are accepted as-is beyond max-length trimming.
	private const int _maxLength = 64;

	public async Task InvokeAsync(HttpContext context)
	{
		var incoming = context.Request.Headers[HeaderName].ToString();

		var correlationId = string.IsNullOrWhiteSpace(incoming)
			? Guid.NewGuid().ToString()
			: incoming.Length > _maxLength ? incoming[.._maxLength] : incoming;

		context.Items[ItemKey] = correlationId;

		context.Response.OnStarting(() =>
		{
			context.Response.Headers[HeaderName] = correlationId;
			return Task.CompletedTask;
		});

		using (logger.BeginScope(new Dictionary<string, object> { [ItemKey] = correlationId }))
		{
			await next(context);
		}
	}
}