using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class LogoutHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	IAccessTokenContext accessTokenContext)
{
	public async Task HandleAsync(LogoutCommand command, CancellationToken cancellationToken)
	{
		// The caller's access token may already be expired (e.g. an idle tab) — that's fine,
		// it can never pass validation again regardless, so there's nothing to denylist.
		// Logout must not depend on a still-valid access token: the refresh-token revocation
		// below is the one that must always succeed.
		var accessTokenToRevoke = accessTokenContext.Jti is Guid jti && accessTokenContext.ExpiresAtUtc is DateTime expiresAt
			? new RevokedAccessToken(jti, expiresAt)
			: null;

		if (!string.IsNullOrEmpty(command.Token))
		{
			var tokenHash = RawToken.From(command.Token).Hash;
			var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);
			if (token is not null)
			{
				token.Revoke();

				// RevokeAsync both revokes the refresh token and denylists the caller's
				// access token atomically within a single database transaction.
				await refreshTokenRepository.RevokeAsync(token.TokenId, accessTokenToRevoke, cancellationToken);
				return;
			}
		}

		// No refresh token to revoke (cookie missing or already gone) - the access token
		// denylist still needs to happen on its own.
		if (accessTokenToRevoke is not null)
			await revokedAccessTokenRepository.AddAsync(accessTokenToRevoke, cancellationToken);
	}
}