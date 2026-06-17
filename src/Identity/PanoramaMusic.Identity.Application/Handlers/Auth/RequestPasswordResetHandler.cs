using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class RequestPasswordResetHandler(
	IUserRepository userRepository,
	IPasswordResetTokenRepository passwordResetTokenRepository,
	IEmailSender emailSender)
{
	public async Task HandleAsync(RequestPasswordResetCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByEmailAsync(command.Request.Email, cancellationToken);
		if (user is null)
			return;

		var rawToken = RawToken.Generate();
		var token = new PasswordResetToken(
			Guid.NewGuid(),
			user.UserId,
			rawToken.Hash,
			DateTime.UtcNow.AddHours(TokenConstants.PasswordResetTokenExpiryHours));

		await passwordResetTokenRepository.AddAsync(token, cancellationToken);
		await emailSender.SendPasswordResetAsync(user.Email.Value, rawToken.Value, cancellationToken);
	}
}