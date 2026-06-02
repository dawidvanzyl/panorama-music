using System.Data;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Data;
using PanoramaMusic.Identity.Infrastructure.Entities;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class InviteTokenRepository(IDapperWrapper dapper) : IInviteTokenRepository
{
    public async Task<InviteToken?> GetByTokenHashAsync(string tokenHash)
    {
        using var connection = dapper.CreateConnection();
        var row = await dapper.QuerySingleOrDefaultAsync<InviteTokenRow>(
            connection,
            "identity.get_invite_token_by_hash",
            new { p_token_hash = tokenHash },
            CommandType.StoredProcedure);

        return row is null ? null : new InviteToken(row.Token_id, row.User_id, row.Token_hash, row.Expires_at);
    }

    public async Task AddAsync(InviteToken token)
    {
        using var connection = dapper.CreateConnection();
        await dapper.ExecuteAsync(
            connection,
            "identity.create_invite_token",
            new
            {
                p_token_id = token.TokenId,
                p_user_id = token.UserId,
                p_token_hash = token.TokenHash,
                p_expires_at = token.ExpiresAt,
            },
            CommandType.StoredProcedure);
    }

    public async Task UpdateAsync(InviteToken token)
    {
        using var connection = dapper.CreateConnection();
        await dapper.ExecuteAsync(
            connection,
            "identity.use_invite_token",
            new { p_token_id = token.TokenId },
            CommandType.StoredProcedure);
    }
}
