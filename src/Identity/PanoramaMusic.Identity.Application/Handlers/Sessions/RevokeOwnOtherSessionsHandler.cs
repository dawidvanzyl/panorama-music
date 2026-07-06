using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Sessions;

public sealed class RevokeOwnOtherSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	IUserContext userContext,
	CurrentSessionResolver currentSessionResolver,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task HandleAsync(RevokeOwnOtherSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken)
			?? throw new UnauthorizedException("Current session could not be identified.");

		await RevokeAllOtherAsync(currentTokenId, cancellationToken);
	}

	private async Task RevokeAllOtherAsync(Guid currentTokenId, CancellationToken cancellationToken)
	{
		var userId = userContext.GetRequiredUserId();

		var activeSessions = await refreshTokenRepository.GetActiveByUserIdAsync(userId, cancellationToken);
		var accessTokensToRevoke = activeSessions
			.Where(s => s.TokenId != currentTokenId)
			.Select(s => s.LiveAccessTokenOrNull())
			.OfType<RevokedAccessToken>()
			.ToList();

		if (accessTokensToRevoke.Count > 0)
		{
			await revokedAccessTokenRepository.DeleteExpiredAsync(cancellationToken);
			await revokedAccessTokenRepository.CreateManyAsync(accessTokensToRevoke, cancellationToken);
		}

		await refreshTokenRepository.RevokeAllForUserExceptAsync(userId, currentTokenId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.TokenRevoked,
				userId,
				userContext.Email,
				userId,
				AuditOutcomes.Success,
				detail: new Dictionary<string, object?> { ["scope"] = "all_other_own_sessions" }),
			cancellationToken);
	}
}