using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class ActivateUserHandler(IUserRepository userRepository)
{
	public async Task HandleAsync(ActivateUserCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByIdAsync(command.UserId, cancellationToken)
			?? throw new EntityNotFoundException($"User {command.UserId} was not found.");

		if (user.IsActive)
			throw new DomainException("Only deactivated users can be activated.");

		await userRepository.ActivateAsync(command.UserId, cancellationToken);
	}
}