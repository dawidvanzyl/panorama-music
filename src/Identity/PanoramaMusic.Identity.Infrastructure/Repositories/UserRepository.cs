using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Adapters;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRepository(IDapperWrapper dapper) : IUserRepository
{
	public async Task<User?> GetByIdAsync(Guid userId)
	{
		using var connection = dapper.CreateConnection();
		var dto = await dapper.QuerySingleOrDefaultAsync<UserDto>(
			connection,
			"identity.get_user_by_id",
			new { p_user_id = userId },
			CommandType.StoredProcedure);

		return dto?.MapToUser();
	}

	public async Task<User?> GetByEmailAsync(string email)
	{
		using var connection = dapper.CreateConnection();
		var dto = await dapper.QuerySingleOrDefaultAsync<UserDto>(
			connection,
			"identity.get_user_by_email",
			new { p_email = email },
			CommandType.StoredProcedure);

		return dto?.MapToUser();
	}

	public async Task AddAsync(User user)
	{
		using var connection = dapper.CreateConnection();
		connection.Open();
		using var transaction = connection.BeginTransaction();
		try
		{
			await dapper.ExecuteAsync(
				connection,
				"identity.create_user",
				new { p_user_id = user.UserId, p_email = user.Email.Value, p_is_active = user.IsActive },
				CommandType.StoredProcedure,
				transaction);

			if (user.PasswordHash is not null)
			{
				await dapper.ExecuteAsync(
					connection,
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					CommandType.StoredProcedure,
					transaction);
			}

			transaction.Commit();
		}
		catch
		{
			transaction.Rollback();
			throw;
		}
	}

	public async Task UpdateAsync(User user)
	{
		using var connection = dapper.CreateConnection();
		connection.Open();
		using var transaction = connection.BeginTransaction();
		try
		{
			if (user.PasswordHash is not null)
			{
				await dapper.ExecuteAsync(
					connection,
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					CommandType.StoredProcedure,
					transaction);
			}

			if (user.IsActive)
			{
				await dapper.ExecuteAsync(
					connection,
					"identity.activate_user",
					new { p_user_id = user.UserId },
					CommandType.StoredProcedure,
					transaction);
			}

			transaction.Commit();
		}
		catch
		{
			transaction.Rollback();
			throw;
		}
	}

	public async Task CompleteActivationAsync(User user, Guid inviteTokenId)
	{
		using var connection = dapper.CreateConnection();
		connection.Open();
		using var transaction = connection.BeginTransaction();
		try
		{
			if (user.PasswordHash is not null)
			{
				await dapper.ExecuteAsync(
					connection,
					"identity.update_user_password",
					new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
					CommandType.StoredProcedure,
					transaction);
			}

			if (user.IsActive)
			{
				await dapper.ExecuteAsync(
					connection,
					"identity.activate_user",
					new { p_user_id = user.UserId },
					CommandType.StoredProcedure,
					transaction);
			}

			await dapper.ExecuteAsync(
				connection,
				"identity.use_invite_token",
				new { p_token_id = inviteTokenId },
				CommandType.StoredProcedure,
				transaction);

			transaction.Commit();
		}
		catch
		{
			transaction.Rollback();
			throw;
		}
	}
}