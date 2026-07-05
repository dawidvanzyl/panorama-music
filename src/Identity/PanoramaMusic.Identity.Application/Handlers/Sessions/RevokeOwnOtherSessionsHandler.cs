using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
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

		var activeSessions = await refreshTokenRepository.GetActiveByUserIdAsync(userContext.UserId, cancellationToken);
		var accessTokensToRevoke = activeSessions
			.Where(s => s.TokenId != currentTokenId)
			.Select(s => s.LiveAccessTokenOrNull())
			.OfType<RevokedAccessToken>()
			.ToList();

		if (accessTokensToRevoke.Count > 0)
		{
			await revokedAccessTokenRepository.DeleteExpiredAsync(cancellationToken);
			await revokedAccessTokenRepository.CreateManyAsync(accessTokensToRevoke, cancellationToken);
		}

		await refreshTokenRepository.RevokeAllForUserExceptAsync(userContext.UserId, currentTokenId, cancellationToken);
	}
}