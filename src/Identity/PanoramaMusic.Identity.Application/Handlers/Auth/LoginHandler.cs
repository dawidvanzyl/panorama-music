using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class LoginHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IPasswordHashService passwordHashService,
	IJwtService jwtService,
	IRefreshTokenRepository refreshTokenRepository,
	IPasswordResetTokenRepository passwordResetTokenRepository,
	IClientContext clientContext)
{
	private const int _refreshTokenExpiryDays = 7;

	public async Task<LoginResult> HandleAsync(LoginCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByEmailAsync(command.Request.Email.ToLowerInvariant(), cancellationToken);
		if (user is null || !user.IsActive)
		{
			passwordHashService.Verify(command.Request.Password, passwordHashService.DummyHash);
			throw new UnauthorizedException("Invalid credentials.");
		}

		if (user.PasswordHash is null || !passwordHashService.Verify(command.Request.Password, user.PasswordHash))
			throw new UnauthorizedException("Invalid credentials.");

		if (user.RequiresPasswordReset)
		{
			var rawResetToken = RawToken.Generate();
			var resetToken = new PasswordResetToken(
				Guid.NewGuid(),
				user.UserId,
				rawResetToken.Hash,
				DateTime.UtcNow.AddHours(TokenConstants.PasswordResetTokenExpiryHours));
			await passwordResetTokenRepository.AddAsync(resetToken, cancellationToken);

			return LoginResult.RotationRequired(rawResetToken.Value);
		}

		var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
		var generatedToken = jwtService.GenerateToken(user.UserId, user.Email.Value, roles);

		var rawRefreshToken = RawToken.Generate();
		var now = DateTime.UtcNow;
		var refreshTokenExpiresAt = now.AddDays(_refreshTokenExpiryDays);

		var tokenId = Guid.NewGuid();
		var refreshToken = new RefreshToken(tokenId, user.UserId, rawRefreshToken.Hash, refreshTokenExpiresAt, tokenId, now, clientContext.UserAgent, clientContext.IpAddress);
		await refreshTokenRepository.AddAsync(refreshToken, cancellationToken);

		return LoginResult.Success(new AuthResult(generatedToken.Token, rawRefreshToken.Value, generatedToken.ExpiresAt, refreshTokenExpiresAt));
	}
}