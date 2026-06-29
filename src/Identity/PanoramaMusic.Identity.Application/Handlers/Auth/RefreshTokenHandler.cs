using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class RefreshTokenHandler(
	IRefreshTokenRepository refreshTokenRepository,
	IUserRepository userRepository,
	IUserRoleRepository userRoleRepository,
	IJwtService jwtService,
	ISessionOptions sessionOptions)
{
	private const int _refreshTokenExpiryDays = 7;

	public async Task<AuthResult> HandleAsync(RefreshTokenCommand command, CancellationToken cancellationToken)
	{
		var tokenHash = RawToken.From(command.Request.Token).Hash;
		var existing = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new UnauthorizedException("Invalid refresh token.");

		if (existing.IsRevoked)
		{
			// A previously rotated (and therefore revoked) token being presented again is a replay —
			// revoke the whole family so the leaked chain can't be used for further rotations.
			await refreshTokenRepository.RevokeFamilyAsync(existing.FamilyId, cancellationToken);
			throw new UnauthorizedException("Refresh token has been revoked.");
		}

		if (existing.IsExpired)
			throw new UnauthorizedException("Refresh token has expired.");

		var absoluteSessionLifetime = TimeSpan.FromDays(sessionOptions.AbsoluteSessionLifetimeDays);
		if (existing.IsSessionExpired(absoluteSessionLifetime))
		{
			existing.Revoke();
			await refreshTokenRepository.UpdateAsync(existing, cancellationToken);
			throw new UnauthorizedException("Session has expired. Please log in again.");
		}

		var user = await userRepository.GetByIdAsync(existing.UserId, cancellationToken)
			?? throw new UnauthorizedException("User not found.");

		if (!user.IsActive)
			throw new UnauthorizedException("User account is not active.");

		var roles = await userRoleRepository.GetRolesAsync(user.UserId, cancellationToken);
		var generatedToken = jwtService.GenerateToken(user.UserId, roles);

		var newRawToken = RawToken.Generate();
		var refreshTokenExpiresAt = DateTime.UtcNow.AddDays(_refreshTokenExpiryDays);

		var newRefreshToken = new RefreshToken(Guid.NewGuid(), user.UserId, newRawToken.Hash, refreshTokenExpiresAt, existing.FamilyId, existing.SessionStartedAt);
		await refreshTokenRepository.RotateAsync(existing.TokenId, newRefreshToken, cancellationToken);

		return new AuthResult(generatedToken.Token, newRawToken.Value, generatedToken.ExpiresAt, refreshTokenExpiresAt);
	}
}