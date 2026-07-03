using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RevokeSessionHandler(
	IRefreshTokenRepository refreshTokenRepository)
{
	public async Task HandleAsync(RevokeSessionCommand command, CancellationToken cancellationToken)
	{
		var session = await refreshTokenRepository.GetByTokenIdAsync(command.TokenId, cancellationToken);
		if (session is null || session.IsRevoked)
			throw new EntityNotFoundException($"Session {command.TokenId} was not found.");

		// RevokeAsync both revokes the refresh token and denylists the session's
		// currently-issued access token atomically within a single database transaction,
		// so a still-valid access token stops working immediately rather than staying
		// valid for up to its remaining 15-minute lifetime.
		await refreshTokenRepository.RevokeAsync(command.TokenId, session.LiveAccessTokenOrNull(), cancellationToken);
	}
}