using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Factories;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RefreshTokenRepository(IDbConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IRefreshTokenRepository
{
	public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_refresh_token_by_hash",
			new { p_token_hash = tokenHash },
			cancellationToken);
		var dto = await connection.QuerySingleOrDefaultAsync<RefreshTokenDto>(command);

		return dto?.MapToRefreshToken();
	}

	public async Task AddAsync(RefreshToken token, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.create_refresh_token",
			new
			{
				p_token_id = token.TokenId,
				p_user_id = token.UserId,
				p_token_hash = token.TokenHash,
				p_expires_at = token.ExpiresAt,
			},
			cancellationToken);
		await connection.ExecuteAsync(command);
	}

	public async Task UpdateAsync(RefreshToken token, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.revoke_refresh_token",
			new { p_token_id = token.TokenId },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}

	public async Task RotateAsync(Guid oldTokenId, RefreshToken newToken, CancellationToken cancellationToken)
	{
		var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			var revokeCommand = CreateCommandDefinition(
				"identity.revoke_refresh_token",
				new { p_token_id = oldTokenId },
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(revokeCommand);

			var createCommand = CreateCommandDefinition(
				"identity.create_refresh_token",
				new
				{
					p_token_id = newToken.TokenId,
					p_user_id = newToken.UserId,
					p_token_hash = newToken.TokenHash,
					p_expires_at = newToken.ExpiresAt,
				},
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(createCommand);

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}
}