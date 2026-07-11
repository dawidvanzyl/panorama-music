using PanoramaMusic.Api.Middleware;

namespace PanoramaMusic.Api.Extensions;

public static class SensitiveResponseExtensions
{
	/// <summary>
	/// Marks an endpoint as returning a token or otherwise sensitive data, so
	/// <see cref="SecurityHeadersMiddleware"/> adds <c>Cache-Control: no-store</c>
	/// to its responses.
	/// </summary>
	public static TBuilder MarkSensitiveResponse<TBuilder>(this TBuilder builder)
		where TBuilder : IEndpointConventionBuilder
		=> builder.WithMetadata(new SensitiveResponseMetadata());
}