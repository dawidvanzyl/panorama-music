using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.Validators;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class ResetPasswordHandler(
	IPasswordResetTokenRepository passwordResetTokenRepository,
	IPasswordHasher passwordHasher)
{
	public async Task HandleAsync(ResetPasswordCommand command, CancellationToken cancellationToken)
	{
		PasswordPolicy.Validate(command.Request.NewPassword);

		var tokenHash = RawToken.From(command.Request.Token).Hash;
		var token = await passwordResetTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new InvalidResetTokenException("Password reset token is invalid or expired.");

		if (token.IsExpired || token.IsUsed)
			throw new InvalidResetTokenException("Password reset token is invalid or expired.");

		token.MarkUsed();

		var passwordHash = passwordHasher.Hash(command.Request.NewPassword);
		await passwordResetTokenRepository.CompleteResetAsync(token.UserId, passwordHash, token.TokenId, cancellationToken);
	}
}