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
		if (!string.IsNullOrEmpty(command.Token))
		{
			var tokenHash = RawToken.From(command.Token).Hash;
			var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken);
			if (token is not null)
			{
				token.Revoke();
				await refreshTokenRepository.UpdateAsync(token, cancellationToken);
			}
		}

		// The caller's access token may already be expired (e.g. an idle tab) — that's fine,
		// it can never pass validation again regardless, so there's nothing to denylist.
		// Logout must not depend on a still-valid access token: the refresh-token revocation
		// above is the one that must always succeed.
		if (accessTokenContext.Jti is Guid jti && accessTokenContext.ExpiresAtUtc is DateTime expiresAt)
		{
			var revokedAccessToken = new RevokedAccessToken(jti, expiresAt);
			await revokedAccessTokenRepository.AddAsync(revokedAccessToken, cancellationToken);
		}
	}
}