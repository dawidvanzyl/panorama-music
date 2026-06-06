using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Factory;
using System.Data;
using System.Data.Common;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRepository(IDbConnectionFactory connectionFactory) : IUserRepository
{
	public async Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken)
	{
		using var connection = connectionFactory.CreateConnection();
		var dto = await connection.QuerySingleOrDefaultAsync<UserDto>(
			"identity.get_user_by_id",
			new { p_user_id = userId },
			commandType: CommandType.StoredProcedure);

		return dto?.MapToUser();
	}

	public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken)
	{
		using var connection = connectionFactory.CreateConnection();
		var dto = await connection.QuerySingleOrDefaultAsync<UserDto>(
			"identity.get_user_by_email",
			new { p_email = email },
			commandType: CommandType.StoredProcedure);

		return dto?.MapToUser();
	}

	public async Task AddAsync(User user, CancellationToken cancellationToken)
	{
		var dbConnection = (DbConnection)connectionFactory.CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			await dbConnection.ExecuteAsync(
				"identity.create_user",
				new { p_user_id = user.UserId, p_email = user.Email.Value, p_is_active = user.IsActive },
				transaction,
				commandType: CommandType.StoredProcedure);

			if (user.PasswordHash is not null)
			{
				await dbConnection.ExecuteAsync(
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					transaction,
					commandType: CommandType.StoredProcedure);
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
		var dbConnection = (DbConnection)connectionFactory.CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			if (user.PasswordHash is not null)
			{
				await dbConnection.ExecuteAsync(
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					transaction,
					commandType: CommandType.StoredProcedure);
			}

			if (user.IsActive)
			{
				await dbConnection.ExecuteAsync(
					"identity.activate_user",
					new { p_user_id = user.UserId },
					transaction,
					commandType: CommandType.StoredProcedure);
			}

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}

	public async Task CompleteActivationAsync(User user, Guid inviteTokenId, CancellationToken cancellationToken)
	{
		var dbConnection = (DbConnection)connectionFactory.CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			if (user.PasswordHash is not null)
			{
				await dbConnection.ExecuteAsync(
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					transaction,
					commandType: CommandType.StoredProcedure);
			}

			if (user.IsActive)
			{
				await dbConnection.ExecuteAsync(
					"identity.activate_user",
					new { p_user_id = user.UserId },
					transaction,
					commandType: CommandType.StoredProcedure);
			}

			await dbConnection.ExecuteAsync(
				"identity.use_invite_token",
				new { p_token_id = inviteTokenId },
				transaction,
				commandType: CommandType.StoredProcedure);

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}
}