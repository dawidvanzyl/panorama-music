using System.Data;
using Dapper;
using Npgsql;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class InviteTokenRepository(NpgsqlConnection connection) : IInviteTokenRepository
{
    private sealed record InviteTokenRow(
        Guid token_id,
        Guid user_id,
        string token_hash,
        DateTime expires_at,
        DateTime? used_at);

    public async Task<InviteToken?> GetByTokenHashAsync(string tokenHash)
    {
        var row = await connection.QuerySingleOrDefaultAsync<InviteTokenRow>(
            "identity.get_invite_token_by_hash",
            new { p_token_hash = tokenHash },
            commandType: CommandType.StoredProcedure);

        return row is null ? null : MapToInviteToken(row);
    }

    public async Task AddAsync(InviteToken token)
    {
        await connection.ExecuteAsync(
            "identity.create_invite_token",
            new
            {
                p_token_id   = token.TokenId,
                p_user_id    = token.UserId,
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

    private static InviteToken MapToInviteToken(InviteTokenRow row)
    {
        // Note: UsedAt state cannot be reconstructed via MarkUsed() without business-rule side effects;
        // the raw row is sufficient for all current use cases (token lookup before use).
        return new InviteToken(row.token_id, row.user_id, row.token_hash, row.expires_at);
    }
}
