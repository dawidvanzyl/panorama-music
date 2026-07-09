using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Sessions;

public sealed class RevokeOwnSessionHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	IUserContext userContext,
	CurrentSessionResolver currentSessionResolver,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task HandleAsync(RevokeOwnSessionCommand command, CancellationToken cancellationToken)
	{
		var session = await refreshTokenRepository.GetByTokenIdAsync(command.TokenId, cancellationToken);
		if (session is null || session.UserId != userContext.GetRequiredUserId() || session.IsRevoked)
			throw new EntityNotFoundException($"Session {command.TokenId} was not found.");

		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken);
		if (session.TokenId == currentTokenId)
			throw new DomainException("You cannot revoke your current session.");

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

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.TokenRevoked,
				userContext.GetRequiredUserId(),
				userContext.Email,
				userContext.GetRequiredUserId(),
				AuditOutcomes.Success),
			cancellationToken);
	}
}