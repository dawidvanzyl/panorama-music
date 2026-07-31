namespace PanoramaMusic.Api.Configurations;

/// <summary>
/// Thresholds for the anti-automation controls required by ASVS 5.0.0-6.1.1 / 6.3.1 —
/// this type and <see cref="RateLimitedAuthPaths"/> together are the documentation that
/// rule calls for, which is why they live here rather than in
/// <c>docs/security-standards.md</c>.
/// <para>
/// Every credential-accepting endpoint is limited on three independent fixed-window
/// dimensions: per-IP, per-account (the submitted email where the request carries one,
/// otherwise the account resolved from the supplied token), and per-token for the
/// endpoints that have no email field. Exceeding any dimension returns 429.
/// </para>
/// <para>
/// The properties are <c>required</c> deliberately: there are no code-level defaults, so a
/// deployment cannot silently run with a permissive limit. Windows reset on their own and
/// there is no manual unlock — an operator-cleared lockout would itself be a denial-of-service
/// against the account, which 6.1.1 explicitly requires be prevented.
/// </para>
/// </summary>
public sealed class AuthRateLimitOptions
{
	public const string SectionName = "RateLimiting:Auth";

	public required int IpPermitLimit { get; set; }

	public required int AccountPermitLimit { get; set; }

	public required int WindowSeconds { get; set; }
}