using System.Data;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Data;
using PanoramaMusic.Identity.Infrastructure.Entities;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RefreshTokenRepository(IDapperWrapper dapper) : IRefreshTokenRepository
{
    public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash)
    {
        using var connection = dapper.CreateConnection();
        var row = await dapper.QuerySingleOrDefaultAsync<RefreshTokenRow>(
            connection,
            "identity.get_refresh_token_by_hash",
            new { p_token_hash = tokenHash },
            CommandType.StoredProcedure);

        return row is null ? null : MapToRefreshToken(row);
    }

    public async Task AddAsync(RefreshToken token)
    {
        using var connection = dapper.CreateConnection();
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
        using var connection = dapper.CreateConnection();
        await dapper.ExecuteAsync(
            connection,
            "identity.revoke_refresh_token",
            new { p_token_id = token.TokenId },
            CommandType.StoredProcedure);
    }

    private static RefreshToken MapToRefreshToken(RefreshTokenRow row)
    {
        var token = new RefreshToken(row.Token_id, row.User_id, row.Token_hash, row.Expires_at);

        if (row.Revoked_at.HasValue)
		{
			token.Revoke(row.Revoked_at.Value);
        }

        return token;
    }
}
