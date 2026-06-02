using System.Data;
using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Entities;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class InviteTokenRepository(IDbConnection connection) : IInviteTokenRepository
{
    public async Task<InviteToken?> GetByTokenHashAsync(string tokenHash)
    {
        var row = await connection.QuerySingleOrDefaultAsync<InviteTokenRow>(
            "identity.get_invite_token_by_hash",
            new { p_token_hash = tokenHash },
            commandType: CommandType.StoredProcedure);

        return row is null ? null : new InviteToken(row.token_id, row.user_id, row.token_hash, row.expires_at);
    }

    public async Task AddAsync(InviteToken token)
    {
        await connection.ExecuteAsync(
            "identity.create_invite_token",
            new
            {
                p_token_id = token.TokenId,
                p_user_id = token.UserId,
                p_token_hash = token.TokenHash,
                p_expires_at = token.ExpiresAt,
            },
            commandType: CommandType.StoredProcedure);
    }

    public async Task UpdateAsync(InviteToken token)
    {
        await connection.ExecuteAsync(
            "identity.use_invite_token",
            new { p_token_id = token.TokenId },
            commandType: CommandType.StoredProcedure);
    }
}
