using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Factory;
using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class InviteTokenRepository(IDbConnectionFactory connectionFactory) : IInviteTokenRepository
{
	public async Task<InviteToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default)
	{
		using var connection = connectionFactory.CreateConnection();
		var dto = await connection.QuerySingleOrDefaultAsync<InviteTokenDto>(
			"identity.get_invite_token_by_hash",
			new { p_token_hash = tokenHash },
			commandType: CommandType.StoredProcedure);

		return dto?.MapToInviteToken();
	}

	public async Task AddAsync(InviteToken token, CancellationToken cancellationToken = default)
	{
		using var connection = connectionFactory.CreateConnection();
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

	public async Task UpdateAsync(InviteToken token, CancellationToken cancellationToken = default)
	{
		using var connection = connectionFactory.CreateConnection();
		await connection.ExecuteAsync(
			"identity.use_invite_token",
			new { p_token_id = token.TokenId },
			commandType: CommandType.StoredProcedure);
	}
}