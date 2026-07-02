using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Services.Sessions;
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

		await refreshTokenRepository.RevokeAllExceptAsync(currentTokenId, cancellationToken);
	}
}