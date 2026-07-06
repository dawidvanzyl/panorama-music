namespace PanoramaMusic.Api.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
	public const string HeaderName = "X-Correlation-ID";
	public const string ItemKey = "CorrelationId";

	public async Task InvokeAsync(HttpContext context)
	{
		var incoming = context.Request.Headers[HeaderName].ToString();

		// A caller-supplied value is honoured only when it is a valid GUID —
		// audit rows persist the correlation id as a UUID, so logs, responses,
		// and audit records always share the same identifier.
		var correlationId = Guid.TryParse(incoming, out var suppliedId)
			? suppliedId.ToString()
			: Guid.NewGuid().ToString();

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