using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class LoginHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IPasswordHashService passwordHashService,
	IJwtService jwtService,
	IRefreshTokenRepository refreshTokenRepository,
	IPasswordResetTokenRepository passwordResetTokenRepository,
	IClientContext clientContext,
	IAuditLogger auditLogger,
	IAuditEventFactory auditEventFactory,
	IUnitOfWork unitOfWork)
{
	private const int _refreshTokenExpiryDays = 7;

	public async Task<LoginResult> HandleAsync(LoginCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByEmailAsync(command.Request.Email.ToLowerInvariant(), cancellationToken);
		if (user is null || !user.IsActive)
		{
			passwordHashService.Verify(command.Request.Password, passwordHashService.DummyHash);
			await AuditLoginFailedAsync(command.Request.Email, cancellationToken);
			throw new UnauthorizedException("Invalid credentials.");
		}

		if (user.PasswordHash is null || !passwordHashService.Verify(command.Request.Password, user.PasswordHash))
		{
			await AuditLoginFailedAsync(command.Request.Email, cancellationToken);
			throw new UnauthorizedException("Invalid credentials.");
		}

		if (user.RequiresPasswordReset)
		{
			var rawResetToken = RawToken.Generate();
			var resetToken = new PasswordResetToken(
				Guid.NewGuid(),
				user.UserId,
				rawResetToken.Hash,
				DateTime.UtcNow.AddHours(TokenConstants.PasswordResetTokenExpiryHours));
			await passwordResetTokenRepository.CreateAsync(resetToken, cancellationToken);

			await auditLogger.CreateAsync(
				auditEventFactory.Create(
					IdentityAuditEventTypes.LoginSucceeded,
					user.UserId,
					user.Email.Value,
					targetId: null,
					AuditOutcomes.Success,
					detail: new Dictionary<string, object?>
					{
						["passwordRotationRequired"] = true
					}),
				cancellationToken);

			return LoginResult.RotationRequired(rawResetToken.Value);
		}

		var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
		var generatedToken = jwtService.GenerateToken(user.UserId, user.Email.Value, roles);

		var rawRefreshToken = RawToken.Generate();
		var now = DateTime.UtcNow;
		var refreshTokenExpiresAt = now.AddDays(_refreshTokenExpiryDays);

		var tokenId = Guid.NewGuid();
		var refreshToken = new RefreshToken(
			tokenId,
			user.UserId,
			rawRefreshToken.Hash,
			refreshTokenExpiresAt,
			tokenId,
			now,
			clientContext.UserAgent,
			clientContext.IpAddress,
			generatedToken.Jti,
			generatedToken.ExpiresAt);

		await refreshTokenRepository.CreateAsync(refreshToken, cancellationToken);

		await auditLogger.CreateAsync(
			auditEventFactory.Create(
				IdentityAuditEventTypes.LoginSucceeded,
				user.UserId,
				user.Email.Value,
				targetId: null,
				AuditOutcomes.Success),
			cancellationToken);

		return LoginResult.Success(new AuthResult(generatedToken.Token, rawRefreshToken.Value, generatedToken.ExpiresAt, refreshTokenExpiresAt));
	}

	// Isolated: the request fails with UnauthorizedException and the middleware
	// rolls back the ambient transaction, so the failure record must commit on
	// its own connection. The attempted email is the only PII recorded — never
	// the submitted password.
	private Task AuditLoginFailedAsync(string attemptedEmail, CancellationToken cancellationToken) =>
		unitOfWork.ExecuteIsolatedAsync(
			() => auditLogger.CreateAsync(
				auditEventFactory.Create(
					IdentityAuditEventTypes.LoginFailed,
					actorId: null,
					actorEmail: null,
					targetId: null,
					AuditOutcomes.Failure,
					reason: "InvalidCredentials",
					detail: new Dictionary<string, object?>
					{
						["attemptedEmail"] = attemptedEmail
					}),
				cancellationToken),
			cancellationToken);
}