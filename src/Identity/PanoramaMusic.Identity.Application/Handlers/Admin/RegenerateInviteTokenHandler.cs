using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Constants;
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

		await RevokeExistingInviteAsync(user, cancellationToken);
		var inviteUrl = await GenerateInviteAsync(user, cancellationToken);

		return new RegenerateInviteTokenResult(inviteUrl);
	}

	private async Task RevokeExistingInviteAsync(User user, CancellationToken cancellationToken)
	{
		await inviteTokenRepository.RevokeForUserAsync(user.UserId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.InviteRevoked,
				userContext.GetRequiredUserId(),
				userContext.Email,
				user.UserId,
				AuditOutcomes.Success,
				detail: new Dictionary<string, object?>
				{
					[AuditEventDetailKeys.TargetDisplay] = user.Email.Value
				}),
			cancellationToken);
	}

	private async Task<string> GenerateInviteAsync(User user, CancellationToken cancellationToken)
	{
		var token = RawToken.Generate();
		var inviteToken = new InviteToken(Guid.NewGuid(), user.UserId, token.Hash, DateTime.UtcNow.AddDays(TokenConstants.InviteTokenExpiryDays));
		await inviteTokenRepository.CreateAsync(inviteToken, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.InviteRegenerated,
				userContext.GetRequiredUserId(),
				userContext.Email,
				user.UserId,
				AuditOutcomes.Success,
				detail: new Dictionary<string, object?>
				{
					[AuditEventDetailKeys.TargetDisplay] = user.Email.Value
				}),
			cancellationToken);

		return $"{appOptions.AppBaseUrl}/#/register?token={token.Value}";
	}
}