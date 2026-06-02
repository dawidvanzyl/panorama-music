using System.Data;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Data;
using PanoramaMusic.Identity.Infrastructure.Entities;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RefreshTokenRepository(IDbConnectionFactory connectionFactory, IDapperWrapper dapper) : IRefreshTokenRepository
{
    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash)
    {
        using var connection = connectionFactory.CreateConnection();
        var row = await dapper.QuerySingleOrDefaultAsync<RefreshTokenRow>(
            connection,
            "identity.get_refresh_token_by_hash",
            new { p_token_hash = tokenHash },
            CommandType.StoredProcedure);

        return row is null ? null : MapToRefreshToken(row);
    }

    public async Task AddAsync(RefreshToken token)
    {
        using var connection = connectionFactory.CreateConnection();
        await dapper.ExecuteAsync(
            connection,
            "identity.create_refresh_token",
            new
            {
                p_token_id = token.TokenId,
                p_user_id = token.UserId,
                p_token_hash = token.TokenHash,
                p_expires_at = token.ExpiresAt,
            },
            CommandType.StoredProcedure);
    }

    public async Task UpdateAsync(RefreshToken token)
    {
        using var connection = connectionFactory.CreateConnection();
        await dapper.ExecuteAsync(
            connection,
            "identity.revoke_refresh_token",
            new { p_token_id = token.TokenId },
            CommandType.StoredProcedure);
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
