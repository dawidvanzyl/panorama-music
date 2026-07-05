using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IUserRoleRepository
{
	Task CreateAsync(UserRole userRole, CancellationToken cancellationToken);
	Task<IList<Role>> GetRolesAsync(Guid userId, CancellationToken cancellationToken);
	Task SetRolesAsync(Guid userId, IList<Role> roles, CancellationToken cancellationToken);
}