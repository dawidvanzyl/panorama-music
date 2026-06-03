using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Adapters;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class InviteTokenRepository(IDapperWrapper dapper) : IInviteTokenRepository
{
	public async Task<InviteToken?> GetByTokenHashAsync(string tokenHash)
	{
		using var connection = dapper.CreateConnection();
		var dto = await dapper.QuerySingleOrDefaultAsync<InviteTokenDto>(
			connection,
			"identity.get_invite_token_by_hash",
			new { p_token_hash = tokenHash },
			CommandType.StoredProcedure);

		return dto?.MapToInviteToken();
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