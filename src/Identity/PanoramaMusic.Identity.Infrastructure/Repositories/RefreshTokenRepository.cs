using System.Data;
using Dapper;
using Npgsql;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Entities;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RefreshTokenRepository(NpgsqlConnection connection) : IRefreshTokenRepository
{
    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash)
    {
        var row = await connection.QuerySingleOrDefaultAsync<RefreshTokenRow>(
            "identity.get_refresh_token_by_hash",
            new { p_token_hash = tokenHash },
            commandType: CommandType.StoredProcedure);

        return row is null ? null : MapToRefreshToken(row);
    }

    public async Task AddAsync(RefreshToken token)
    {
        await connection.ExecuteAsync(
            "identity.create_refresh_token",
            new
            {
                p_token_id = token.TokenId,
                p_user_id = token.UserId,
                p_token_hash = token.TokenHash,
                p_expires_at = token.ExpiresAt,
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task UpdateAsync(RefreshToken token)
    {
        await connection.ExecuteAsync(
            "identity.revoke_refresh_token",
            new { p_token_id = token.TokenId },
            commandType: CommandType.StoredProcedure);
    }

    private static RefreshToken MapToRefreshToken(RefreshTokenRow row)
    {
        var token = new RefreshToken(row.token_id, row.user_id, row.token_hash, row.expires_at);

        if (row.revoked_at.HasValue)
        {
            token.Revoke(row.revoked_at.Value);
        }

        return token;
    }
}
