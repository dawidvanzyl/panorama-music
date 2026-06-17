using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class LoginHandler(
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IPasswordHasher passwordHasher,
	IJwtService jwtService,
	IRefreshTokenRepository refreshTokenRepository)
{
	private const int _refreshTokenExpiryDays = 7;

	public async Task<AuthResult> HandleAsync(LoginCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByEmailAsync(command.Request.Email.ToLowerInvariant(), cancellationToken)
			?? throw new UnauthorizedException("Invalid credentials.");

		if (!user.IsActive)
			throw new UnauthorizedException("User account is not active.");

		if (user.PasswordHash is null || !passwordHasher.Verify(command.Request.Password, user.PasswordHash))
			throw new UnauthorizedException("Invalid credentials.");

		var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
		var generatedToken = jwtService.GenerateToken(user.UserId, roles);

		var rawRefreshToken = RawToken.Generate();
		var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpiryDays);

		var refreshToken = new RefreshToken(Guid.NewGuid(), user.UserId, rawRefreshToken.Hash, refreshTokenExpiresAt);
		await refreshTokenRepository.AddAsync(refreshToken, cancellationToken);

		return new AuthResult(generatedToken.Token, rawRefreshToken.Value, generatedToken.ExpiresAt, refreshTokenExpiresAt);
	}
}