using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class GetAllSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	CurrentSessionResolver currentSessionResolver)
{
	public async Task<IList<AdminSessionResult>> HandleAsync(GetAllSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken);

		var sessions = await refreshTokenRepository.GetAllActiveWithOwnerAsync(cancellationToken);

		return [.. sessions.Select(session => new AdminSessionResult(
			session.TokenId,
			session.UserId,
			session.UserEmail,
			session.UserRoles,
			session.SessionStartedAt,
			session.LastSeenAt,
			session.ExpiresAt,
			session.DeviceLabel,
			session.IpAddress,
			session.TokenId == currentTokenId))];
	}
}