using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Factory;
using System.Data;
using System.Data.Common;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RefreshTokenRepository(IDbConnectionFactory connectionFactory) : IRefreshTokenRepository
{
	public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken)
	{
		using var connection = connectionFactory.CreateConnection();
		var dto = await connection.QuerySingleOrDefaultAsync<RefreshTokenDto>(
			"identity.get_refresh_token_by_hash",
			new { p_token_hash = tokenHash },
			commandType: CommandType.StoredProcedure);

		return dto?.MapToRefreshToken();
	}

	public async Task AddAsync(RefreshToken token, CancellationToken cancellationToken)
	{
		using var connection = connectionFactory.CreateConnection();
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

	public async Task UpdateAsync(RefreshToken token, CancellationToken cancellationToken)
	{
		using var connection = connectionFactory.CreateConnection();
		await connection.ExecuteAsync(
			"identity.revoke_refresh_token",
			new { p_token_id = token.TokenId },
			commandType: CommandType.StoredProcedure);
	}

	public async Task RotateAsync(Guid oldTokenId, RefreshToken newToken, CancellationToken cancellationToken)
	{
		var dbConnection = (DbConnection)connectionFactory.CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			await dbConnection.ExecuteAsync(
				"identity.revoke_refresh_token",
				new { p_token_id = oldTokenId },
				transaction,
				commandType: CommandType.StoredProcedure);

			await dbConnection.ExecuteAsync(
				"identity.create_refresh_token",
				new
				{
					p_token_id = newToken.TokenId,
					p_user_id = newToken.UserId,
					p_token_hash = newToken.TokenHash,
					p_expires_at = newToken.ExpiresAt,
				},
				transaction,
				commandType: CommandType.StoredProcedure);

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}
}