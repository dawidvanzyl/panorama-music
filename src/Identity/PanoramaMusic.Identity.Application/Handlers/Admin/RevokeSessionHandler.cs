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

		if (session.LiveAccessTokenOrNull() is { } revokedAccessToken)
		{
			await revokedAccessTokenRepository.DeleteExpiredAsync(cancellationToken);
			await revokedAccessTokenRepository.CreateAsync(revokedAccessToken, cancellationToken);
		}

		await refreshTokenRepository.RevokeAsync(command.TokenId, cancellationToken);
	}
}