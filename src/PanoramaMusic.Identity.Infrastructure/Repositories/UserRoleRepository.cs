using Dapper;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRoleRepository(IUnitOfWork unitOfWork) : RepositoryBase(unitOfWork), IUserRoleRepository
{
	public async Task CreateManyAsync(Guid userId, IList<Role> roles, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.create_user_roles",
			new
			{
				p_user_id = userId,
				p_roles = roles.Select(r => r.ToString()).ToArray()
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task<IList<Role>> GetRolesAsync(Guid userId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_roles_by_user_id",
			new { p_user_id = userId },
			Transaction,
			cancellationToken);
		var rows = await Connection.QueryAsync<string>(command);

		return [.. rows.Select(r => Enum.Parse<Role>(r, ignoreCase: true))];
	}

	public async Task SetRolesAsync(Guid userId, IList<Role> roles, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_user_roles",
			new
			{
				p_user_id = userId,
				p_roles = roles.Select(r => r.ToString()).ToArray()
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}
}