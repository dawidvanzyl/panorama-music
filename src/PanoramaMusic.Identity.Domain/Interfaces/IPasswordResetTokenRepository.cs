using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IPasswordResetTokenRepository
{
	Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken);
	Task CreateAsync(PasswordResetToken token, CancellationToken cancellationToken);
	Task UseAsync(Guid tokenId, CancellationToken cancellationToken);
}