using System.Data;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Adapter;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRoleRepository(IDapperWrapper dapper) : IUserRoleRepository
{
    public async Task AddAsync(UserRole userRole)
    {
        using var connection = dapper.CreateConnection();
        await dapper.ExecuteAsync(
            connection,
            "identity.add_user_role",
            new { p_user_id = userRole.UserId, p_role = userRole.Role.ToString() },
            CommandType.StoredProcedure);
    }

    public async Task<IList<Role>> GetRolesAsync(Guid userId)
    {
        using var connection = dapper.CreateConnection();
        var rows = await dapper.QueryAsync<string>(
            connection,
            "identity.get_roles_by_user_id",
            new { p_user_id = userId },
            CommandType.StoredProcedure);

        return [.. rows.Select(r => Enum.Parse<Role>(r, ignoreCase: true))];
    }
}
