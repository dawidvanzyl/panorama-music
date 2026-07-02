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

		await refreshTokenRepository.RevokeAllForUserExceptAsync(userContext.UserId, currentTokenId, cancellationToken);
	}
}