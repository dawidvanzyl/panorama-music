using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class RequestPasswordResetHandler(
	IUserRepository userRepository,
	IPasswordResetTokenRepository passwordResetTokenRepository,
	IEmailService emailService)
{
	public async Task HandleAsync(RequestPasswordResetCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByEmailAsync(command.Request.Email.ToLowerInvariant(), cancellationToken);
		if (user is null)
			return;

		var rawToken = RawToken.Generate();
		var token = new PasswordResetToken(
			Guid.NewGuid(),
			user.UserId,
			rawToken.Hash,
			DateTime.UtcNow.AddHours(TokenConstants.PasswordResetTokenExpiryHours));

		await passwordResetTokenRepository.CreateAsync(token, cancellationToken);
		await emailService.SendPasswordResetAsync(user.Email.Value, rawToken.Value, cancellationToken);
	}
}