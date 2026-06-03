using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Adapters;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RefreshTokenRepository(IDapperWrapper dapper) : IRefreshTokenRepository
{
	public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash)
	{
		using var connection = dapper.CreateConnection();
		var dto = await dapper.QuerySingleOrDefaultAsync<RefreshTokenDto>(
			connection,
			"identity.get_refresh_token_by_hash",
			new { p_token_hash = tokenHash },
			CommandType.StoredProcedure);

		return dto?.MapToRefreshToken();
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

	public async Task RotateAsync(Guid oldTokenId, RefreshToken newToken)
	{
		using var connection = dapper.CreateConnection();
		connection.Open();
		using var transaction = connection.BeginTransaction();
		try
		{
			await dapper.ExecuteAsync(
				connection,
				"identity.revoke_refresh_token",
				new { p_token_id = oldTokenId },
				CommandType.StoredProcedure,
				transaction);

			await dapper.ExecuteAsync(
				connection,
				"identity.create_refresh_token",
				new
				{
					p_token_id = newToken.TokenId,
					p_user_id = newToken.UserId,
					p_token_hash = newToken.TokenHash,
					p_expires_at = newToken.ExpiresAt,
				},
				CommandType.StoredProcedure,
				transaction);

			transaction.Commit();
		}
		catch
		{
			transaction.Rollback();
			throw;
		}
	}
}