using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IRefreshTokenRepository
{
	Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken);
	Task AddAsync(RefreshToken token, CancellationToken cancellationToken);
	Task UpdateAsync(RefreshToken token, CancellationToken cancellationToken);
	Task RotateAsync(Guid oldTokenId, RefreshToken newToken, CancellationToken cancellationToken);
}