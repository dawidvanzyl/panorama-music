using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Entities;
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
	// Deliberately identical across every rejection branch (missing token, expired,
	// used, or orphaned) so the response never signals which case actually applied.
	private const string _invalidTokenMessage = "Password reset token is invalid or expired.";

	public async Task HandleAsync(ResetPasswordCommand command, CancellationToken cancellationToken)
	{
		var tokenHash = RawToken.From(command.Request.Token).Hash;
		var token = await passwordResetTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new InvalidResetTokenException(_invalidTokenMessage);

		if (token.IsExpired || token.IsUsed)
			throw new InvalidResetTokenException(_invalidTokenMessage);

		var user = await userRepository.GetByIdAsync(token.UserId, cancellationToken)
			?? throw new InvalidResetTokenException(_invalidTokenMessage);

		token.MarkUsed();

		var passwordHash = passwordHashService.Hash(command.Request.NewPassword);
		await passwordResetTokenRepository.UseAsync(token.TokenId, cancellationToken);

		await UpdatePasswordAsync(user, passwordHash.Value, cancellationToken);
	}

	private async Task UpdatePasswordAsync(User user, string passwordHash, CancellationToken cancellationToken)
	{
		// clearRequiresPasswordReset: completing a reset ends a forced rotation,
		// otherwise the account would be re-prompted on every login.
		await userRepository.UpdatePasswordAsync(user.UserId, passwordHash, clearRequiresPasswordReset: true, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.PasswordResetCompleted,
				user.UserId,
				user.Email.Value,
				targetId: null,
				AuditOutcomes.Success),
			cancellationToken);
	}
}