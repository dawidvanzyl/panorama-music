using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Common;

public interface IUserRoleRepository
{
    Task AddAsync(UserRole userRole);
    Task<IList<Role>> GetRolesAsync(Guid userId);
}
