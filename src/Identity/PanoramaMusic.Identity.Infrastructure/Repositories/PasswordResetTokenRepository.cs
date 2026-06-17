using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Factories;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class PasswordResetTokenRepository(IDbConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IPasswordResetTokenRepository
{
	public async Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_password_reset_token_by_hash",
			new { p_token_hash = tokenHash },
			cancellationToken);
		var dto = await connection.QuerySingleOrDefaultAsync<PasswordResetTokenDto>(command);

		return dto?.MapToPasswordResetToken();
	}

	public async Task AddAsync(PasswordResetToken token, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.create_password_reset_token",
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

	public async Task CompleteResetAsync(Guid userId, PasswordHash passwordHash, Guid tokenId, CancellationToken cancellationToken)
	{
		var dbConnection = CreateConnection();
		await dbConnection.OpenAsync(cancellationToken);
		await using var transaction = await dbConnection.BeginTransactionAsync(cancellationToken);
		try
		{
			var updatePasswordCommand = CreateCommandDefinition(
				"identity.update_user_password",
				new { p_user_id = userId, p_password_hash = passwordHash.Value },
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(updatePasswordCommand);

			var useTokenCommand = CreateCommandDefinition(
				"identity.use_password_reset_token",
				new { p_token_id = tokenId },
				transaction,
				cancellationToken);
			await dbConnection.ExecuteAsync(useTokenCommand);

			await transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			await transaction.RollbackAsync(cancellationToken);
			throw;
		}
	}
}