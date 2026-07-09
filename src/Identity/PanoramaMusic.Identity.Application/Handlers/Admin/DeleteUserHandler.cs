using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class DeleteUserHandler(
	IUserRepository userRepository,
	IAdminOptions adminOptions,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task HandleAsync(DeleteUserCommand command, CancellationToken cancellationToken)
	{
		if (command.UserId == userContext.GetRequiredUserId())
			throw new DomainException("You cannot delete your own account.");

		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new EntityNotFoundException($"User {command.UserId} was not found.");

		if (!string.IsNullOrEmpty(adminOptions.SeedAdminEmail) && string.Equals(user.Email.Value, adminOptions.SeedAdminEmail, StringComparison.OrdinalIgnoreCase))
			throw new DomainException("The seed administrator account cannot be deleted.");

		if (user.IsActive)
			throw new DomainException("Only deactivated users can be permanently deleted.");

		await DeleteAsync(command.UserId, user.Email.Value, cancellationToken);
	}

	private async Task DeleteAsync(Guid userId, string deletedUserEmail, CancellationToken cancellationToken)
	{
		await userRepository.DeleteAsync(userId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.UserDeleted,
				userContext.GetRequiredUserId(),
				userContext.Email,
				userId,
				AuditOutcomes.Success,
				detail: new Dictionary<string, object?>
				{
					[AuditEventDetailKeys.TargetDisplay] = deletedUserEmail
				}),
			cancellationToken);
	}
}