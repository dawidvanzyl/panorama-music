using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IPasswordResetTokenRepository
{
	Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken);
	Task AddAsync(PasswordResetToken token, CancellationToken cancellationToken);
	Task CompleteResetAsync(Guid userId, PasswordHash passwordHash, Guid tokenId, CancellationToken cancellationToken);
}