using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class DeactivateUserHandler(
	IUserRepository userRepository,
	IAdminOptions adminOptions,
	IUserContext userContext)
{
	public async Task HandleAsync(DeactivateUserCommand command, CancellationToken cancellationToken)
	{
		if (command.UserId == userContext.UserId)
			throw new DomainException("You cannot deactivate your own account.");

		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new EntityNotFoundException($"User {command.UserId} was not found.");

		if (!string.IsNullOrEmpty(adminOptions.SeedAdminEmail) && string.Equals(user.Email.Value, adminOptions.SeedAdminEmail, StringComparison.OrdinalIgnoreCase))
			throw new DomainException("The seed administrator account cannot be deactivated.");

		await userRepository.DeactivateAsync(command.UserId, cancellationToken);
	}
}