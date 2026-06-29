using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IRevokedAccessTokenRepository
{
	Task AddAsync(RevokedAccessToken token, CancellationToken cancellationToken);
	Task<bool> ExistsAsync(Guid jti, CancellationToken cancellationToken);
}