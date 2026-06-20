using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Factories;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRoleRepository(IDbConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IUserRoleRepository
{
	public async Task AddAsync(UserRole userRole, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.add_user_role",
			new { p_user_id = userRole.UserId, p_role = userRole.Role.ToString() },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}

	public async Task<IList<Role>> GetRolesAsync(Guid userId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_roles_by_user_id",
			new { p_user_id = userId },
			cancellationToken);
		var rows = await connection.QueryAsync<string>(command);

		return [.. rows.Select(r => Enum.Parse<Role>(r, ignoreCase: true))];
	}

	public async Task SetRolesAsync(Guid userId, IList<Role> roles, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.set_user_roles",
			new { p_user_id = userId, p_roles = roles.Select(r => r.ToString()).ToArray() },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}
}