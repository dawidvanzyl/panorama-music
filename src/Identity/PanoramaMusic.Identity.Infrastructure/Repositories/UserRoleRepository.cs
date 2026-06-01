using System.Data;
using Dapper;
using Npgsql;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRoleRepository(NpgsqlConnection connection) : IUserRoleRepository
{
    public async Task AddAsync(UserRole userRole)
    {
        await connection.ExecuteAsync(
            "identity.add_user_role",
            new { p_user_id = userRole.UserId, p_role = userRole.Role.ToString() },
            commandType: CommandType.StoredProcedure);
    }

    public async Task<IList<Role>> GetRolesAsync(Guid userId)
    {
        var rows = await connection.QueryAsync<string>(
            "identity.get_roles_by_user_id",
            new { p_user_id = userId },
            commandType: CommandType.StoredProcedure);

        return rows.Select(r => Enum.Parse<Role>(r)).ToList();
    }
}
