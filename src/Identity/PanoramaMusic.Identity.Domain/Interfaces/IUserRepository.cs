using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IUserRepository
{
	Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);
	Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
	Task AddAsync(User user, CancellationToken cancellationToken = default);
	Task UpdateAsync(User user, CancellationToken cancellationToken = default);
	Task CompleteActivationAsync(User user, Guid inviteTokenId, CancellationToken cancellationToken = default);
}