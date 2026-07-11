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

public sealed class DeactivateUserHandler(
	IUserRepository userRepository,
	IRefreshTokenRepository refreshTokenRepository,
	IAdminOptions adminOptions,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task HandleAsync(DeactivateUserCommand command, CancellationToken cancellationToken)
	{
		if (command.UserId == userContext.GetRequiredUserId())
			throw new DomainException("You cannot deactivate your own account.");

		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new EntityNotFoundException($"User {command.UserId} was not found.");

		if (!string.IsNullOrEmpty(adminOptions.SeedAdminEmail) && string.Equals(user.Email.Value, adminOptions.SeedAdminEmail, StringComparison.OrdinalIgnoreCase))
			throw new DomainException("The seed administrator account cannot be deactivated.");

		await DeactivateAsync(user, cancellationToken);

		// Deactivation must end every live session immediately (ASVS 7.4.2); this
		// write shares the ambient unit-of-work transaction with the deactivation above.
		await RevokeSessionsAsync(user, cancellationToken);
	}

	private async Task DeactivateAsync(User user, CancellationToken cancellationToken)
	{
		await userRepository.DeactivateAsync(user.UserId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.UserDeactivated,
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

	private async Task RevokeSessionsAsync(User user, CancellationToken cancellationToken)
	{
		await refreshTokenRepository.RevokeAllForUserAsync(user.UserId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.TokenRevoked,
				userContext.GetRequiredUserId(),
				userContext.Email,
				user.UserId,
				AuditOutcomes.Success,
				reason: AuditReasons.UserDeactivated,
				detail: new Dictionary<string, object?>
				{
					[AuditEventDetailKeys.TargetDisplay] = user.Email.Value
				}),
			cancellationToken);
	}
}