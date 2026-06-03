using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IUserRoleRepository
{
	Task AddAsync(UserRole userRole, CancellationToken cancellationToken = default);
	Task<IList<Role>> GetRolesAsync(Guid userId, CancellationToken cancellationToken = default);
}