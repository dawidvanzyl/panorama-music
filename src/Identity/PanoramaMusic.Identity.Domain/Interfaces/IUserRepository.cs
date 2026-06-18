using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IUserRepository
{
	Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken);
	Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken);
	Task<IList<User>> GetAllAsync(CancellationToken cancellationToken);
	Task AddAsync(User user, CancellationToken cancellationToken);
	Task UpdateAsync(User user, CancellationToken cancellationToken);
	Task CompleteActivationAsync(User user, Guid inviteTokenId, CancellationToken cancellationToken);
	Task DeactivateAsync(Guid userId, CancellationToken cancellationToken);
}