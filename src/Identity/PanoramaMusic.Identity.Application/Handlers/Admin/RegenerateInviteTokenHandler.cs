using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class RegenerateInviteTokenHandler(
	IUserRepository userRepository,
	IInviteTokenRepository inviteTokenRepository,
	IAppOptions appOptions,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task<RegenerateInviteTokenResult> HandleAsync(RegenerateInviteTokenCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new DomainException("User not found.");

		await RevokeExistingInviteAsync(user.UserId, cancellationToken);
		var inviteUrl = await GenerateInviteAsync(user.UserId, cancellationToken);

		return new RegenerateInviteTokenResult(inviteUrl);
	}

	private async Task RevokeExistingInviteAsync(Guid userId, CancellationToken cancellationToken)
	{
		await inviteTokenRepository.RevokeForUserAsync(userId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.InviteRevoked,
				userContext.GetRequiredUserId(),
				userContext.Email,
				userId,
				AuditOutcomes.Success),
			cancellationToken);
	}

	private async Task<string> GenerateInviteAsync(Guid userId, CancellationToken cancellationToken)
	{
		var token = RawToken.Generate();
		var inviteToken = new InviteToken(Guid.NewGuid(), userId, token.Hash, DateTime.UtcNow.AddDays(TokenConstants.InviteTokenExpiryDays));
		await inviteTokenRepository.CreateAsync(inviteToken, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.InviteRegenerated,
				userContext.GetRequiredUserId(),
				userContext.Email,
				userId,
				AuditOutcomes.Success),
			cancellationToken);

		return $"{appOptions.AppBaseUrl}/#/register?token={token.Value}";
	}
}