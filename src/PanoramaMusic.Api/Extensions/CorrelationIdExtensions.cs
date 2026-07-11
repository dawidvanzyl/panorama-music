using PanoramaMusic.Api.Middleware;

namespace PanoramaMusic.Api.Extensions;

public static class CorrelationIdExtensions
{
	/// <summary>
	/// Returns the correlation id assigned by <see cref="CorrelationIdMiddleware"/>,
	/// or <c>null</c> when the middleware has not run for this request.
	/// </summary>
	public static string? GetCorrelationId(this HttpContext httpContext) =>
		httpContext.Items.TryGetValue(CorrelationIdMiddleware.ItemKey, out var value)
			? value as string
			: null;
}