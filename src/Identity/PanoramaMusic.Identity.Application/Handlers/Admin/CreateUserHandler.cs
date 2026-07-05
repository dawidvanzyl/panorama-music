using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Admin;

public sealed class CreateUserHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IInviteTokenRepository inviteTokenRepository,
	IAppOptions appOptions)
{
	public async Task<CreateUserResult> HandleAsync(CreateUserCommand command, CancellationToken cancellationToken)
	{
		var email = Email.Create(command.Request.Email);

		var existing = await userRepository.GetByEmailAsync(email.Value, cancellationToken);
		if (existing is not null)
			throw new DomainException("A user with this email already exists.");

		var user = new User(Guid.NewGuid(), email, DateTime.UtcNow);
		await userRepository.CreateAsync(user, cancellationToken);
		foreach (var role in command.Request.Roles)
			await userRoleRepository.CreateAsync(new UserRole(user.UserId, role), cancellationToken);

		var token = RawToken.Generate();
		var inviteToken = new InviteToken(Guid.NewGuid(), user.UserId, token.Hash, DateTime.UtcNow.AddDays(TokenConstants.InviteTokenExpiryDays));
		await inviteTokenRepository.CreateAsync(inviteToken, cancellationToken);

		return new CreateUserResult(user.UserId, $"{appOptions.AppBaseUrl}/#/register?token={token.Value}");
	}
}