using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class LogoutHandler(IRefreshTokenRepository refreshTokenRepository)
{
    public async Task HandleAsync(LogoutCommand command, CancellationToken cancellationToken)
    {
        var tokenHash = TokenHasher.ComputeSha256Hash(command.Token);
        var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash)
            ?? throw new UnauthorizedException("Invalid refresh token.");

        token.Revoke();
        await refreshTokenRepository.UpdateAsync(token);
    }
}
