using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Sessions;

public sealed class GetOwnSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IUserContext userContext,
	CurrentSessionResolver currentSessionResolver)
{
	public async Task<IList<SessionResult>> HandleAsync(GetOwnSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken);

		var sessions = await refreshTokenRepository.GetActiveByUserIdAsync(userContext.GetRequiredUserId(), cancellationToken);

		return sessions
			.Select(session => new SessionResult(
				session.TokenId,
				session.SessionStartedAt,
				session.LastSeenAt,
				session.ExpiresAt,
				session.DeviceLabel,
				session.IpAddress,
				session.TokenId == currentTokenId))
			.ToList();
	}
}