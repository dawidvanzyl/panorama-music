using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Constants;
using PanoramaMusic.Identity.Application.Extensions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class UpdateUserRolesHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IAdminOptions adminOptions,
	IUserContext userContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
{
	public async Task<UpdateUserRolesResult> HandleAsync(UpdateUserRolesCommand command, CancellationToken cancellationToken)
	{
		if (command.UserId == userContext.GetRequiredUserId())
			throw new DomainException("You cannot edit your own role assignment.");

		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new EntityNotFoundException($"User {command.UserId} was not found.");

		if (!string.IsNullOrEmpty(adminOptions.SeedAdminEmail) && string.Equals(user.Email.Value, adminOptions.SeedAdminEmail, StringComparison.OrdinalIgnoreCase))
			throw new DomainException("The seed administrator account cannot be modified.");

		await SetRolesAsync(user, command.Request.Roles, cancellationToken);

		return new UpdateUserRolesResult(user.UserId, user.Email.Value, command.Request.Roles, user.IsActive);
	}

	private async Task SetRolesAsync(User user, IList<Role> newRoles, CancellationToken cancellationToken)
	{
		var rolesBefore = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
		await userRoleRepository.SetRolesAsync(user.UserId, newRoles, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.RolesChanged,
				userContext.GetRequiredUserId(),
				userContext.Email,
				user.UserId,
				AuditOutcomes.Success,
				detail: new Dictionary<string, object?>
				{
					[AuditEventDetailKeys.TargetDisplay] = user.Email.Value,
					[AuditEventDetailKeys.RolesBefore] = rolesBefore.Select(r => r.ToString()).ToArray(),
					[AuditEventDetailKeys.RolesAfter] = newRoles.Select(r => r.ToString()).ToArray(),
				}),
			cancellationToken);
	}
}