using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Sessions;

public sealed class RevokeOwnOtherSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	IUserContext userContext,
	CurrentSessionResolver currentSessionResolver)
{
	public async Task HandleAsync(RevokeOwnOtherSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken)
			?? throw new UnauthorizedException("Current session could not be identified.");

		// The bulk refresh-token revocation below only blocks future /refresh calls - denylist
		// each affected session's currently-issued access token too, so they stop working
		// immediately rather than staying valid for up to their remaining 15-minute lifetime.
		var activeSessions = await refreshTokenRepository.GetActiveByUserIdAsync(userContext.UserId, cancellationToken);
		foreach (var session in activeSessions.Where(s => s.TokenId != currentTokenId))
		{
			if (session.LiveAccessTokenOrNull() is { } revoked)
				await revokedAccessTokenRepository.AddAsync(revoked, cancellationToken);
		}

		await refreshTokenRepository.RevokeAllForUserExceptAsync(userContext.UserId, currentTokenId, cancellationToken);
	}
}