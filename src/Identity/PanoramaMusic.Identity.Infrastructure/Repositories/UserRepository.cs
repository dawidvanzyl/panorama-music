using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Factories;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRepository(IDbConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IUserRepository
{
	public async Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_user_by_id",
			new { p_user_id = userId },
			cancellationToken);
		var dto = await connection.QuerySingleOrDefaultAsync<UserDto>(command);

		return dto?.MapToUser();
	}

	public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_user_by_email",
			new { p_email = email },
			cancellationToken);
		var dto = await connection.QuerySingleOrDefaultAsync<UserDto>(command);

		return dto?.MapToUser();
	}

	public async Task<IList<User>> GetAllAsync(CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_users",
			null,
			cancellationToken);
		var dtos = await connection.QueryAsync<UserDto>(command);

		return [.. dtos.Select(dto => dto.MapToUser())];
	}

	public async Task AddAsync(User user, CancellationToken cancellationToken)
	{
		var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			var createUserCommand = CreateCommandDefinition(
				"identity.create_user",
				new
				{
					p_user_id = user.UserId,
					p_email = user.Email.Value,
					p_is_active = user.IsActive,
					p_requires_password_reset = user.RequiresPasswordReset,
				},
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(createUserCommand);

			if (user.PasswordHash is not null)
			{
				var updatePasswordCommand = CreateCommandDefinition(
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					transaction,
					cancellationToken);
				await dbConnection.ExecuteAsync(updatePasswordCommand);
			}

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}

	public async Task UpdateAsync(User user, CancellationToken cancellationToken)
	{
		var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			if (user.PasswordHash is not null)
			{
				var updatePasswordCommand = CreateCommandDefinition(
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					transaction,
					cancellationToken);
				await dbConnection.ExecuteAsync(updatePasswordCommand);
			}

			if (user.IsActive)
			{
				var activateUserCommand = CreateCommandDefinition(
					"identity.update_activate_user",
					new { p_user_id = user.UserId },
					transaction,
					cancellationToken);
				await dbConnection.ExecuteAsync(activateUserCommand);
			}

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}

	public async Task DeactivateAsync(Guid userId, CancellationToken cancellationToken)
	{
		await using var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			var deactivateCommand = CreateCommandDefinition(
				"identity.update_deactivate_user",
				new { p_user_id = userId },
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(deactivateCommand);

			var revokeTokensCommand = CreateCommandDefinition(
				"identity.update_revoke_all_refresh_tokens",
				new { p_user_id = userId },
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(revokeTokensCommand);

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}

	public async Task DeleteAsync(Guid userId, CancellationToken cancellationToken)
	{
		await using var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		var command = CreateCommandDefinition(
			"identity.delete_user",
			new { p_user_id = userId },
			cancellationToken: cancellationToken);
		await dbConnection.ExecuteAsync(command);
	}

	public async Task ActivateAsync(Guid userId, CancellationToken cancellationToken)
	{
		await using var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		var command = CreateCommandDefinition(
			"identity.update_activate_user",
			new { p_user_id = userId },
			cancellationToken: cancellationToken);
		await dbConnection.ExecuteAsync(command);
	}

	public async Task CompleteActivationAsync(User user, Guid inviteTokenId, CancellationToken cancellationToken)
	{
		var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			if (user.PasswordHash is not null)
			{
				var updatePasswordCommand = CreateCommandDefinition(
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					transaction,
					cancellationToken);
				await dbConnection.ExecuteAsync(updatePasswordCommand);
			}

			if (user.IsActive)
			{
				var activateUserCommand = CreateCommandDefinition(
					"identity.update_activate_user",
					new { p_user_id = user.UserId },
					transaction,
					cancellationToken);
				await dbConnection.ExecuteAsync(activateUserCommand);
			}

			var useInviteTokenCommand = CreateCommandDefinition(
				"identity.update_use_invite_token",
				new { p_token_id = inviteTokenId },
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(useInviteTokenCommand);

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}
}