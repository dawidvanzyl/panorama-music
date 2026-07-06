using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class ResetPasswordHandler(
	IPasswordResetTokenRepository passwordResetTokenRepository,
	IUserRepository userRepository,
	IPasswordHashService passwordHashService,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory)
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

		await UpdatePasswordAsync(token.UserId, passwordHash.Value, cancellationToken);
	}

	private async Task UpdatePasswordAsync(Guid userId, string passwordHash, CancellationToken cancellationToken)
	{
		// clearRequiresPasswordReset: completing a reset ends a forced rotation,
		// otherwise the account would be re-prompted on every login.
		await userRepository.UpdatePasswordAsync(userId, passwordHash, clearRequiresPasswordReset: true, cancellationToken);

		var user = await userRepository.GetByIdAsync(userId, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.PasswordResetCompleted,
				userId,
				user?.Email.Value,
				targetId: null,
				AuditOutcomes.Success),
			cancellationToken);
	}
}