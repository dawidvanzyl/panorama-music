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
    private const int RefreshTokenExpiryDays = 7;

    public async Task<AuthResult> HandleAsync(RefreshTokenCommand command, CancellationToken ct = default)
    {
        var tokenHash = TokenHasher.ComputeSha256Hash(command.Request.Token);
        var existing = await refreshTokenRepository.GetByTokenHashAsync(tokenHash)
            ?? throw new UnauthorizedException("Invalid refresh token.");

        if (existing.IsExpired)
            throw new UnauthorizedException("Refresh token has expired.");

        if (existing.IsRevoked)
            throw new UnauthorizedException("Refresh token has been revoked.");

        existing.Revoke();
        await refreshTokenRepository.UpdateAsync(existing);

        var user = await userRepository.GetByIdAsync(existing.UserId)
            ?? throw new UnauthorizedException("User not found.");

        var roles = await userRoleRepository.GetRolesAsync(user.UserId);
        var accessToken = jwtService.GenerateToken(user.UserId, roles);

        var rawToken = Guid.NewGuid().ToString();
        var newTokenHash = TokenHasher.ComputeSha256Hash(rawToken);
        var expiresAt = DateTime.UtcNow.AddDays(RefreshTokenExpiryDays);

        var newRefreshToken = new RefreshToken(Guid.NewGuid(), user.UserId, newTokenHash, expiresAt);
        await refreshTokenRepository.AddAsync(newRefreshToken);

        return new AuthResult(accessToken, rawToken, expiresAt);
    }
}
