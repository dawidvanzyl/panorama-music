using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RevokeAllSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	CurrentSessionResolver currentSessionResolver)
{
	public async Task HandleAsync(RevokeAllSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken)
			?? throw new UnauthorizedException("Current session could not be identified.");

		// This read happens before RevokeAllExceptAsync's transaction, not inside it, so a
		// session created in the narrow window between this read and that transaction's
		// UPDATE would have its refresh token revoked (the UPDATE's own WHERE clause
		// re-evaluates "every non-current session" at write time) without its access token
		// being denylisted here. Accepted trade-off: the impact is bounded to that one new
		// session's access token remaining valid for at most its own ~15-minute lifetime,
		// and closing it fully would require moving this read inside the repository's
		// transaction, which conflicts with keeping list-building an Application concern.
		var activeSessions = await refreshTokenRepository.GetAllActiveAsync(cancellationToken);
		var accessTokensToRevoke = activeSessions
			.Where(s => s.TokenId != currentTokenId)
			.Select(s => s.LiveAccessTokenOrNull())
			.OfType<RevokedAccessToken>()
			.ToList();

		// RevokeAllExceptAsync both revokes the refresh tokens and denylists each affected
		// session's currently-issued access token atomically within a single database
		// transaction, so still-valid access tokens stop working immediately rather than
		// staying valid for up to their remaining 15-minute lifetime.
		await refreshTokenRepository.RevokeAllExceptAsync(currentTokenId, accessTokensToRevoke, cancellationToken);
	}
}