using System.Collections.Immutable;

namespace PanoramaMusic.Api.Configurations;

/// <summary>
/// The auth endpoints subject to rate limiting, and which of those are keyed by an opaque
/// token (rather than an email) for the account dimension. Shared by
/// <see cref="Middleware.RateLimitingMiddleware"/> and
/// <see cref="Extensions.RateLimitingExtensions"/> so both agree on exactly the same set.
/// </summary>
public static class RateLimitedAuthPaths
{
	public static readonly ImmutableHashSet<string> AccountKeyed = ImmutableHashSet.Create(
		StringComparer.OrdinalIgnoreCase,
		"/api/auth/login",
		"/api/auth/refresh",
		"/api/auth/forgot-password",
		"/api/auth/reset-password"
	);

	public static readonly ImmutableHashSet<string> TokenKeyed = ImmutableHashSet.Create(
		StringComparer.OrdinalIgnoreCase,
		"/api/auth/refresh",
		"/api/auth/reset-password"
	);
}