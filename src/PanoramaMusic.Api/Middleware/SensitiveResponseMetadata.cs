namespace PanoramaMusic.Api.Middleware;

/// <summary>
/// Endpoint metadata marker indicating the endpoint returns a token or otherwise
/// sensitive data. Read by <see cref="SecurityHeadersMiddleware"/>.
/// </summary>
public sealed class SensitiveResponseMetadata
{
}