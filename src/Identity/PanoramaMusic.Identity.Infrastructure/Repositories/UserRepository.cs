using System.Data;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Data;
using PanoramaMusic.Identity.Infrastructure.Entities;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRepository(IDbConnectionFactory connectionFactory, IDapperWrapper dapper) : IUserRepository
{
    public async Task<User?> GetByIdAsync(Guid userId)
    {
        using var connection = connectionFactory.CreateConnection();
        var row = await dapper.QuerySingleOrDefaultAsync<UserRow>(
            connection,
            "identity.get_user_by_id",
            new { p_user_id = userId },
            CommandType.StoredProcedure);

        return row is null ? null : MapToUser(row);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        using var connection = connectionFactory.CreateConnection();
        var row = await dapper.QuerySingleOrDefaultAsync<UserRow>(
            connection,
            "identity.get_user_by_email",
            new { p_email = email },
            CommandType.StoredProcedure);

        return row is null ? null : MapToUser(row);
    }

    public async Task AddAsync(User user)
    {
        using var connection = connectionFactory.CreateConnection();
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
        using var connection = connectionFactory.CreateConnection();
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

    private static User MapToUser(UserRow row)
    {
        var user = new User(row.user_id, Email.Create(row.email), row.created_at);

        if (row.password_hash is not null) user.SetPassword(PasswordHash.Create(row.password_hash));
        if (row.is_active) user.Activate();

        return user;
    }
}
