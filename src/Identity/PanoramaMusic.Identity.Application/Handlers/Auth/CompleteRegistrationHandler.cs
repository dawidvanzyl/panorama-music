using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.Validators;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class CompleteRegistrationHandler(
	IInviteTokenRepository inviteTokenRepository,
	IUserRepository userRepository,
	IPasswordHasher passwordHasher)
{
	public async Task HandleAsync(CompleteRegistrationCommand command, CancellationToken cancellationToken)
	{
		PasswordPolicy.Validate(command.Request.NewPassword);

		var tokenHash = RawToken.From(command.Request.InviteToken).Hash;
		var inviteToken = await inviteTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new UnauthorizedException("Invalid invite token.");

		inviteToken.MarkUsed();

		var user = await userRepository.GetByIdAsync(inviteToken.UserId, cancellationToken)
			?? throw new UnauthorizedException("User not found.");

		var passwordHash = passwordHasher.Hash(command.Request.NewPassword);
		user.SetPassword(passwordHash);
		user.Activate();

		await userRepository.CompleteActivationAsync(user, inviteToken.TokenId, cancellationToken);
	}
}