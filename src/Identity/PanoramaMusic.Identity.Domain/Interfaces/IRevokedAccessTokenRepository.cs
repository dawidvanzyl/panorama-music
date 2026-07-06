using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IRevokedAccessTokenRepository
{
	Task CreateAsync(RevokedAccessToken token, CancellationToken cancellationToken);
	Task CreateManyAsync(IReadOnlyList<RevokedAccessToken> tokens, CancellationToken cancellationToken);
	Task DeleteExpiredAsync(CancellationToken cancellationToken);
	Task<bool> ExistsAsync(Guid jti, CancellationToken cancellationToken);
}