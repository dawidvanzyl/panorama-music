using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IUserRepository
{
	Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken);
	Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken);
	Task<IList<User>> GetAllAsync(CancellationToken cancellationToken);
	Task CreateAsync(User user, CancellationToken cancellationToken);
	Task UpdatePasswordAsync(Guid userId, string passwordHash, bool clearRequiresPasswordReset, CancellationToken cancellationToken);
	Task DeactivateAsync(Guid userId, CancellationToken cancellationToken);
	Task DeleteAsync(Guid userId, CancellationToken cancellationToken);
	Task ActivateAsync(Guid userId, CancellationToken cancellationToken);
}