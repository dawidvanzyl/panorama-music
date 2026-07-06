using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class ActivateUserHandler(
	IUserRepository userRepository,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task HandleAsync(ActivateUserCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new EntityNotFoundException($"User {command.UserId} was not found.");

		if (user.IsActive)
			throw new DomainException("Only deactivated users can be activated.");

		await ActivateAsync(command.UserId, cancellationToken);
	}

	private async Task ActivateAsync(Guid userId, CancellationToken cancellationToken)
	{
		await userRepository.ActivateAsync(userId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.UserActivated,
				userContext.GetRequiredUserId(),
				userContext.Email,
				userId,
				AuditOutcomes.Success),
			cancellationToken);
	}
}