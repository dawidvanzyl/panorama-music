using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Application.Handlers.Auth;

public sealed class LogoutHandler(IRefreshTokenRepository refreshTokenRepository)
{
	public async Task HandleAsync(LogoutCommand command, CancellationToken cancellationToken)
	{
		var tokenHash = RawToken.From(command.Token).Hash;
		var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, cancellationToken)
			?? throw new UnauthorizedException("Invalid refresh token.");

		token.Revoke();
		await refreshTokenRepository.UpdateAsync(token, cancellationToken);
	}
}