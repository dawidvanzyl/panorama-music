using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RevokeAllSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	CurrentSessionResolver currentSessionResolver)
{
	public async Task HandleAsync(RevokeAllSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken)
			?? throw new UnauthorizedException("Current session could not be identified.");

		// The bulk refresh-token revocation below only blocks future /refresh calls - denylist
		// each affected session's currently-issued access token too, so they stop working
		// immediately rather than staying valid for up to their remaining 15-minute lifetime.
		var activeSessions = await refreshTokenRepository.GetAllActiveAsync(cancellationToken);
		foreach (var session in activeSessions.Where(s => s.TokenId != currentTokenId))
		{
			if (session.LiveAccessTokenOrNull() is { } revoked)
				await revokedAccessTokenRepository.AddAsync(revoked, cancellationToken);
		}

		await refreshTokenRepository.RevokeAllExceptAsync(currentTokenId, cancellationToken);
	}
}