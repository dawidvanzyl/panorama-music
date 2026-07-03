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

		// RevokeAllExceptAsync both revokes the refresh tokens and denylists each affected
		// session's currently-issued access token atomically in a single database function
		// call, so still-valid access tokens stop working immediately rather than staying
		// valid for up to their remaining 15-minute lifetime.
		await refreshTokenRepository.RevokeAllExceptAsync(currentTokenId, cancellationToken);
	}
}