using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Sessions;

public sealed class RevokeOwnOtherSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IUserContext userContext,
	CurrentSessionResolver currentSessionResolver)
{
	public async Task HandleAsync(RevokeOwnOtherSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken)
			?? throw new UnauthorizedException("Current session could not be identified.");

		// This read happens before RevokeAllForUserExceptAsync's transaction, not inside it,
		// so a session created in the narrow window between this read and that
		// transaction's UPDATE would have its refresh token revoked (the UPDATE's own
		// WHERE clause re-evaluates "every other session for this user" at write time)
		// without its access token being denylisted here. Accepted trade-off: the impact
		// is bounded to that one new session's access token remaining valid for at most
		// its own ~15-minute lifetime, and closing it fully would require moving this read
		// inside the repository's transaction, which conflicts with keeping list-building
		// an Application concern.
		var activeSessions = await refreshTokenRepository.GetActiveByUserIdAsync(userContext.UserId, cancellationToken);
		var accessTokensToRevoke = activeSessions
			.Where(s => s.TokenId != currentTokenId)
			.Select(s => s.LiveAccessTokenOrNull())
			.OfType<RevokedAccessToken>()
			.ToList();

		// RevokeAllForUserExceptAsync both revokes the refresh tokens and denylists each
		// affected session's currently-issued access token atomically within a single
		// database transaction, so still-valid access tokens stop working immediately
		// rather than staying valid for up to their remaining 15-minute lifetime.
		await refreshTokenRepository.RevokeAllForUserExceptAsync(userContext.UserId, currentTokenId, accessTokensToRevoke, cancellationToken);
	}
}