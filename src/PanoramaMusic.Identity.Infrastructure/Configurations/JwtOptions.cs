using PanoramaMusic.Identity.Application.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Configurations;

/// <summary>
/// JWT signing and session-lifetime configuration. Documents the session timeouts required by
/// ASVS 5.0.0-7.1.1: the absolute session lifetime is bounded by the refresh token, which is
/// rotated on every use and revoked on logout, and no inactivity timeout is enforced separately
/// from it. The access token's own (much shorter) expiry is defined by the token generator; it
/// also bounds how long a revoked user's stale authorization claims stay usable — see
/// <c>DeactivateUserHandler</c> and ASVS 5.0.0-8.3.2.
/// <para>
/// No cap is placed on concurrent sessions (ASVS 5.0.0-7.1.2): each login issues an
/// independent refresh token, so multiple devices per user are permitted by design.
/// </para>
/// </summary>
public class JwtOptions : ISessionOptions
{
	public const string SectionName = "JWT";

	public string Secret { get; set; } = string.Empty;

	public string Issuer { get; set; } = string.Empty;

	public string Audience { get; set; } = string.Empty;

	public int AbsoluteSessionLifetimeDays { get; set; }
}