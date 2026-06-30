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
	IPasswordHashService passwordHashService,
	IJwtService jwtService,
	IRefreshTokenRepository refreshTokenRepository)
{
	private const int _refreshTokenExpiryDays = 7;

	public async Task<AuthResult> HandleAsync(LoginCommand command, CancellationToken cancellationToken)
	{
		var user = await userRepository.GetByEmailAsync(command.Request.Email.ToLowerInvariant(), cancellationToken)
			?? throw new UnauthorizedException("Invalid credentials.");

		if (!user.IsActive)
			throw new UnauthorizedException("Invalid credentials.");

		if (user.PasswordHash is null || !passwordHashService.Verify(command.Request.Password, user.PasswordHash))
			throw new UnauthorizedException("Invalid credentials.");

		var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
		var generatedToken = jwtService.GenerateToken(user.UserId, roles);

		var rawRefreshToken = RawToken.Generate();
		var now = DateTime.UtcNow;
		var refreshTokenExpiresAt = now.AddDays(_refreshTokenExpiryDays);

		var tokenId = Guid.NewGuid();
		var refreshToken = new RefreshToken(tokenId, user.UserId, rawRefreshToken.Hash, refreshTokenExpiresAt, tokenId, now);
		await refreshTokenRepository.AddAsync(refreshToken, cancellationToken);

		return new AuthResult(generatedToken.Token, rawRefreshToken.Value, generatedToken.ExpiresAt, refreshTokenExpiresAt);
	}
}