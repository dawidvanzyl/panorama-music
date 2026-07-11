using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RevokeSessionHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	IUserRepository userRepository,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task HandleAsync(RevokeSessionCommand command, CancellationToken cancellationToken)
	{
		var session = await refreshTokenRepository.GetByTokenIdAsync(command.TokenId, cancellationToken);
		if (session is null || session.IsRevoked)
			throw new EntityNotFoundException($"Session {command.TokenId} was not found.");

		await RevokeAsync(session, cancellationToken);
	}

	private async Task RevokeAsync(RefreshToken session, CancellationToken cancellationToken)
	{
		if (session.LiveAccessTokenOrNull() is { } revokedAccessToken)
		{
			await revokedAccessTokenRepository.DeleteExpiredAsync(cancellationToken);
			await revokedAccessTokenRepository.CreateAsync(revokedAccessToken, cancellationToken);
		}

		await refreshTokenRepository.RevokeAsync(session.TokenId, cancellationToken);

		var targetUser = await userRepository.GetByIdAsync(session.UserId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.TokenRevoked,
				userContext.GetRequiredUserId(),
				userContext.Email,
				session.UserId,
				AuditOutcomes.Success,
				detail: targetUser is not null
					? new Dictionary<string, object?> { [AuditEventDetailKeys.TargetDisplay] = targetUser.Email.Value }
					: null),
			cancellationToken);
	}
}