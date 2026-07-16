using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Services.Sessions;

/// <summary>
/// Resolves which refresh token (session) the caller's request cookie belongs to, so session
/// handlers can mark the caller's own session in a listing or reject revoking it directly.
/// </summary>
public sealed class CurrentSessionResolver(IRefreshTokenRepository refreshTokenRepository)
{
	public async Task<Guid?> ResolveAsync(string? currentRefreshToken, CancellationToken cancellationToken)
	{
		if (string.IsNullOrEmpty(currentRefreshToken))
			return null;

		var tokenHash = RawToken.From(currentRefreshToken).Hash;
		var current = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);

		return current?.TokenId;
	}
}