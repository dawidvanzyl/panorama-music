using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class GetAllSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	CurrentSessionResolver currentSessionResolver)
{
	public async Task<IList<AdminSessionResult>> HandleAsync(GetAllSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken);

		var sessions = await refreshTokenRepository.GetAllActiveAsync(cancellationToken);

		var results = new List<AdminSessionResult>();
		foreach (var session in sessions)
		{
			var owner = await userRepository.GetByIdAsync(session.UserId, cancellationToken);
			var roles = await userRoleRepository.GetRolesAsync(session.UserId, cancellationToken);

			results.Add(new AdminSessionResult(
				session.TokenId,
				session.UserId,
				owner?.Email.Value ?? session.UserId.ToString(),
				roles,
				session.SessionStartedAt,
				session.LastSeenAt,
				session.ExpiresAt,
				session.DeviceLabel,
				session.IpAddress,
				session.TokenId == currentTokenId));
		}

		return results;
	}
}