using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IUserRepository
{
	Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken);
	Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken);
	Task<IList<User>> GetAllAsync(CancellationToken cancellationToken);

	/// <summary>Every user holding the given role.</summary>
	Task<IList<User>> GetByRoleAsync(Role role, CancellationToken cancellationToken);

	/// <summary>
	/// The users matching the given ids, resolved in one pass so callers never
	/// need a lookup per id.
	/// </summary>
	Task<IList<User>> GetByIdsAsync(IReadOnlyCollection<Guid> userIds, CancellationToken cancellationToken);
	Task CreateAsync(User user, CancellationToken cancellationToken);
	Task UpdatePasswordAsync(Guid userId, string passwordHash, bool clearRequiresPasswordReset, CancellationToken cancellationToken);
	Task DeactivateAsync(Guid userId, CancellationToken cancellationToken);
	Task DeleteAsync(Guid userId, CancellationToken cancellationToken);
	Task ActivateAsync(Guid userId, CancellationToken cancellationToken);
}