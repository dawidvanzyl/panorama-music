using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRepository(IUnitOfWork unitOfWork) : RepositoryBase(unitOfWork), IUserRepository
{
	public async Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_user_by_id",
			new { p_user_id = userId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<UserDto>(command);

		return dto?.MapToUser();
	}

	public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_user_by_email",
			new { p_email = email },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<UserDto>(command);

		return dto?.MapToUser();
	}

	public async Task<IList<User>> GetAllAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_users",
			null,
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<UserDto>(command);

		return [.. dtos.Select(dto => dto.MapToUser())];
	}

	public async Task CreateAsync(User user, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.create_user",
			new
			{
				p_user_id = user.UserId,
				p_email = user.Email.Value,
				p_is_active = user.IsActive,
				p_requires_password_reset = user.RequiresPasswordReset,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task UpdatePasswordAsync(Guid userId, string passwordHash, bool clearRequiresPasswordReset, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_user_password",
			new
			{
				p_user_id = userId,
				p_password_hash = passwordHash,
				p_clear_requires_password_reset = clearRequiresPasswordReset,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task DeactivateAsync(Guid userId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_deactivate_user",
			new { p_user_id = userId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task DeleteAsync(Guid userId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.delete_user",
			new { p_user_id = userId },
			Transaction,
			cancellationToken: cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task ActivateAsync(Guid userId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_activate_user",
			new { p_user_id = userId },
			Transaction,
			cancellationToken: cancellationToken);
		await Connection.ExecuteAsync(command);
	}
}