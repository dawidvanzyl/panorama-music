using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RevokeAllSessionsHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	CurrentSessionResolver currentSessionResolver,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task HandleAsync(RevokeAllSessionsCommand command, CancellationToken cancellationToken)
	{
		var currentTokenId = await currentSessionResolver.ResolveAsync(command.CurrentRefreshToken, cancellationToken)
			?? throw new UnauthorizedException("Current session could not be identified.");

		await RevokeAllExceptCurrentAsync(currentTokenId, cancellationToken);
	}

	private async Task RevokeAllExceptCurrentAsync(Guid currentTokenId, CancellationToken cancellationToken)
	{
		var activeSessions = await refreshTokenRepository.GetAllActiveAsync(cancellationToken);
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

		await refreshTokenRepository.RevokeAllExceptAsync(currentTokenId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.TokenRevoked,
				userContext.GetRequiredUserId(),
				userContext.Email,
				targetId: null,
				AuditOutcomes.Success,
				detail: new Dictionary<string, object?> { ["scope"] = "all_other_sessions" }),
			cancellationToken);
	}
}