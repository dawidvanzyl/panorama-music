using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RevokeSessionHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository)
{
	public async Task HandleAsync(RevokeSessionCommand command, CancellationToken cancellationToken)
	{
		var session = await refreshTokenRepository.GetByTokenIdAsync(command.TokenId, cancellationToken);
		if (session is null || session.IsRevoked)
			throw new EntityNotFoundException($"Session {command.TokenId} was not found.");

		// The refresh-token revocation below only blocks future /refresh calls - denylist
		// the session's currently-issued access token too, so it stops working immediately
		// rather than staying valid for up to its remaining 15-minute lifetime.
		if (session.LiveAccessTokenOrNull() is { } revoked)
			await revokedAccessTokenRepository.AddAsync(revoked, cancellationToken);

		await refreshTokenRepository.RevokeAsync(command.TokenId, cancellationToken);
	}
}