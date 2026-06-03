using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IRefreshTokenRepository
{
	Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
	Task AddAsync(RefreshToken token, CancellationToken cancellationToken = default);
	Task UpdateAsync(RefreshToken token, CancellationToken cancellationToken = default);
	Task RotateAsync(Guid oldTokenId, RefreshToken newToken, CancellationToken cancellationToken = default);
}