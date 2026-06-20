using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class DeleteUserHandler(
	IUserRepository userRepository,
	IAdminOptions adminOptions,
	IUserContext userContext)
{
	public async Task HandleAsync(DeleteUserCommand command, CancellationToken cancellationToken)
	{
		if (command.UserId == userContext.UserId)
			throw new DomainException("You cannot delete your own account.");

		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new EntityNotFoundException($"User {command.UserId} was not found.");

		if (!string.IsNullOrEmpty(adminOptions.SeedAdminEmail) && string.Equals(user.Email.Value, adminOptions.SeedAdminEmail, StringComparison.OrdinalIgnoreCase))
			throw new DomainException("The seed administrator account cannot be deleted.");

		if (user.IsActive)
			throw new DomainException("Only deactivated users can be permanently deleted.");

		await userRepository.DeleteAsync(command.UserId, cancellationToken);
	}
}