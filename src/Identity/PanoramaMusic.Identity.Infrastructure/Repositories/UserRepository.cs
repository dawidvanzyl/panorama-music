using System.Data;
using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Entities;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class UserRepository(IDbConnection connection) : IUserRepository
{
    public async Task<User?> GetByIdAsync(Guid userId)
    {
        var row = await connection.QuerySingleOrDefaultAsync<UserRow>(
            "identity.get_user_by_id",
            new { p_user_id = userId },
            commandType: CommandType.StoredProcedure);

        return row is null ? null : MapToUser(row);
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        var row = await connection.QuerySingleOrDefaultAsync<UserRow>(
            "identity.get_user_by_email",
            new { p_email = email },
            commandType: CommandType.StoredProcedure);

        return row is null ? null : MapToUser(row);
    }

    public async Task AddAsync(User user)
    {
        await connection.ExecuteAsync(
            "identity.create_user",
            new { p_user_id = user.UserId, p_email = user.Email.Value, p_is_active = user.IsActive },
            commandType: CommandType.StoredProcedure);

        if (user.PasswordHash is not null)
        {
            await connection.ExecuteAsync(
                "identity.update_user_password",
                new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
                commandType: CommandType.StoredProcedure);
        }
    }

    public async Task UpdateAsync(User user)
    {
        if (user.PasswordHash is not null)
        {
            await connection.ExecuteAsync(
                "identity.update_user_password",
                new { p_user_id = user.UserId, p_password_hash = user.PasswordHash.Value },
                commandType: CommandType.StoredProcedure);
        }

        if (user.IsActive)
        {
            await connection.ExecuteAsync(
                "identity.activate_user",
                new { p_user_id = user.UserId },
                commandType: CommandType.StoredProcedure);
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
