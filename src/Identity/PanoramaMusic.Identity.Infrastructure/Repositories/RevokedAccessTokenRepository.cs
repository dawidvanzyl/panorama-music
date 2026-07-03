using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Factories;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RevokedAccessTokenRepository(IDbConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IRevokedAccessTokenRepository
{
	public async Task AddAsync(RevokedAccessToken token, CancellationToken cancellationToken)
	{
		await using var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			var cleanupCommand = CreateCommandDefinition(
				"identity.delete_expired_revoked_access_tokens",
				null,
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(cleanupCommand);

			var insertCommand = CreateCommandDefinition(
				"identity.create_revoked_access_token",
				new
				{
					p_jti = token.Jti,
					p_expires_at = token.ExpiresAt,
				},
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(insertCommand);

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}

	public async Task<bool> ExistsAsync(Guid jti, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_revoked_access_token_by_jti",
			new { p_jti = jti },
			cancellationToken);
		var result = await connection.QuerySingleOrDefaultAsync<Guid?>(command);

		return result.HasValue;
	}
}