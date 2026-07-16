using PanoramaMusic.Identity.Application.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Application.Services.Auth;

/// <summary>
/// Checks the two independent revocation mechanisms an access token must clear on every
/// authenticated request: a per-session jti denylist (logout) and the account's active status
/// (deactivation/deletion). Extracted so the JwtBearer OnTokenValidated event in
/// ServiceCollectionExtensions stays a thin adapter over a directly testable service.
/// </summary>
public sealed class AccessTokenValidationService(
	IRevokedAccessTokenRepository revokedAccessTokenRepository,
	IUserRepository userRepository)
{
	public async Task<AccessTokenState> ValidateAsync(Guid jti, Guid userId, CancellationToken cancellationToken)
	{
		if (await revokedAccessTokenRepository.ExistsAsync(jti, cancellationToken))
			return AccessTokenState.Revoked;

		var user = await userRepository.GetByIdAsync(userId, cancellationToken);
		return user is null || !user.IsActive
			? AccessTokenState.UserInactive
			: AccessTokenState.Valid;
	}
}