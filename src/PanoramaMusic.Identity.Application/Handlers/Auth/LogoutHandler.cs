using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class LogoutHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	IAccessTokenContext accessTokenContext,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
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
				if (accessTokenToRevoke is not null)
				{
					await revokedAccessTokenRepository.DeleteExpiredAsync(cancellationToken);
					await revokedAccessTokenRepository.CreateAsync(accessTokenToRevoke, cancellationToken);
				}

				await refreshTokenRepository.RevokeAsync(token.TokenId, cancellationToken);
				await AuditLoggedOutAsync(cancellationToken);
				return;
			}
		}

		// No refresh token to revoke (cookie missing or already gone) - the access token
		// denylist still needs to happen on its own.
		if (accessTokenToRevoke is not null)
			await revokedAccessTokenRepository.CreateAsync(accessTokenToRevoke, cancellationToken);

		await AuditLoggedOutAsync(cancellationToken);
	}

	// Actor is null-safe: a logout with an already-expired access token carries
	// no authenticated principal.
	private Task AuditLoggedOutAsync(CancellationToken cancellationToken) =>
		auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.LoggedOut,
				userContext.UserId,
				userContext.Email,
				targetId: null,
				AuditOutcomes.Success),
			cancellationToken);
}