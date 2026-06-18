using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using System.Security.Claims;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class UpdateUserRolesHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IAdminOptions adminOptions,
	ClaimsPrincipal currentUser)
{
	public async Task<UpdateUserRolesResult> HandleAsync(UpdateUserRolesCommand command, CancellationToken cancellationToken)
	{
		var requestingUserId = Guid.Parse(currentUser.FindFirst("sub")!.Value);

		if (command.UserId == requestingUserId)
			throw new DomainException("You cannot edit your own role assignment.");

		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new EntityNotFoundException($"User {command.UserId} was not found.");

		if (!string.IsNullOrEmpty(adminOptions.SeedAdminEmail) && string.Equals(user.Email.Value, adminOptions.SeedAdminEmail, StringComparison.OrdinalIgnoreCase))
			throw new DomainException("The seed administrator account cannot be modified.");

		if (command.Request.Roles.Count == 0)
			throw new ValidationException("At least one role must be assigned.");

		await userRoleRepository.SetRolesAsync(command.UserId, command.Request.Roles, cancellationToken);

		return new UpdateUserRolesResult(user.UserId, user.Email.Value, command.Request.Roles, user.IsActive);
	}
}