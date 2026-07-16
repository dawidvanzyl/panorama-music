using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Services.Auth;

/// <summary>
/// Resolves the account a refresh or password-reset token belongs to, so callers outside the
/// Application layer (e.g. Api rate-limiting middleware) never need to depend on the Domain
/// repositories or token-hashing value objects directly.
/// </summary>
public sealed class RateLimitTokenService(
	IRefreshTokenRepository refreshTokenRepository,
	IPasswordResetTokenRepository passwordResetTokenRepository)
{
	public async Task<Guid?> GetRefreshTokenAccountAsync(string rawToken, CancellationToken cancellationToken)
	{
		var tokenHash = RawToken.From(rawToken).Hash;
		var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);
		return token?.UserId;
	}

	public async Task<Guid?> GetPasswordResetTokenAccountAsync(string rawToken, CancellationToken cancellationToken)
	{
		var tokenHash = RawToken.From(rawToken).Hash;
		var token = await passwordResetTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);
		return token?.UserId;
	}
}