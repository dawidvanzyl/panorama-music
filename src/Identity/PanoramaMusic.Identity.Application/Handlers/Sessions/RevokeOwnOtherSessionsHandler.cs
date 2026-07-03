using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
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

		// RevokeAllForUserExceptAsync both revokes the refresh tokens and denylists each
		// affected session's currently-issued access token atomically in a single database
		// function call, so still-valid access tokens stop working immediately rather than
		// staying valid for up to their remaining 15-minute lifetime.
		await refreshTokenRepository.RevokeAllForUserExceptAsync(userContext.UserId, currentTokenId, cancellationToken);
	}
}