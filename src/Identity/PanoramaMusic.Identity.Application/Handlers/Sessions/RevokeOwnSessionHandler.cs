using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Sessions;

public sealed class RevokeOwnSessionHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	IUserContext userContext,
	CurrentSessionResolver currentSessionResolver)
{
	public async Task HandleAsync(RevokeOwnSessionCommand command, CancellationToken cancellationToken)
	{
		var session = await refreshTokenRepository.GetByTokenIdAsync(command.TokenId, cancellationToken);
		if (session is null || session.UserId != userContext.UserId || session.IsRevoked)
			throw new EntityNotFoundException($"Session {command.TokenId} was not found.");

		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken);
		if (session.TokenId == currentTokenId)
			throw new DomainException("You cannot revoke your current session.");

		// The refresh-token revocation below only blocks future /refresh calls - denylist
		// the session's currently-issued access token too, so it stops working immediately
		// rather than staying valid for up to its remaining 15-minute lifetime.
		if (session.LiveAccessTokenOrNull() is { } revoked)
			await revokedAccessTokenRepository.AddAsync(revoked, cancellationToken);

		await refreshTokenRepository.RevokeAsync(command.TokenId, cancellationToken);
	}
}