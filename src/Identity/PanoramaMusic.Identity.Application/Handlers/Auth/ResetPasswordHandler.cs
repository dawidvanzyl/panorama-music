using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class ResetPasswordHandler(
	IPasswordResetTokenRepository passwordResetTokenRepository,
	IUserRepository userRepository,
	IPasswordHashService passwordHashService)
{
	public async Task HandleAsync(ResetPasswordCommand command, CancellationToken cancellationToken)
	{
		var tokenHash = RawToken.From(command.Request.Token).Hash;
		var token = await passwordResetTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new InvalidResetTokenException("Password reset token is invalid or expired.");

		if (token.IsExpired || token.IsUsed)
			throw new InvalidResetTokenException("Password reset token is invalid or expired.");

		token.MarkUsed();

		var passwordHash = passwordHashService.Hash(command.Request.NewPassword);
		await passwordResetTokenRepository.UseAsync(token.TokenId, cancellationToken);

		// clearRequiresPasswordReset: completing a reset ends a forced rotation,
		// otherwise the account would be re-prompted on every login.
		await userRepository.UpdatePasswordAsync(token.UserId, passwordHash.Value, clearRequiresPasswordReset: true, cancellationToken);
	}
}