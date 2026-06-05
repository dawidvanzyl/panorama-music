using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class RefreshTokenHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IJwtService jwtService)
{
	private const int _refreshTokenExpiryDays = 7;

	public async Task<AuthResult> HandleAsync(RefreshTokenCommand command, CancellationToken cancellationToken = default)
	{
		var tokenHash = TokenHasher.ComputeSha256Hash(command.Request.Token);
		var existing = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new UnauthorizedException("Invalid refresh token.");

		if (existing.IsExpired)
			throw new UnauthorizedException("Refresh token has expired.");

		if (existing.IsRevoked)
			throw new UnauthorizedException("Refresh token has been revoked.");

		var user = await userRepository.GetByIdAsync(existing.UserId, cancellationToken)
			?? throw new UnauthorizedException("User not found.");

		var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
		var generatedToken = jwtService.GenerateToken(user.UserId, roles);

		var rawToken = Guid.NewGuid().ToString();
		var newTokenHash = TokenHasher.ComputeSha256Hash(rawToken);
		var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpiryDays);

		var newRefreshToken = new RefreshToken(Guid.NewGuid(), user.UserId, newTokenHash, refreshTokenExpiresAt);
		await refreshTokenRepository.RotateAsync(existing.TokenId, newRefreshToken, cancellationToken);

		return new AuthResult(generatedToken.Token, rawToken, generatedToken.ExpiresAt, refreshTokenExpiresAt);
	}
}