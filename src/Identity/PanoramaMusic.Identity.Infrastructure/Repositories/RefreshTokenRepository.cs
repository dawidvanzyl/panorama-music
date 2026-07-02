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

	public async Task<RefreshToken?> GetByTokenIdAsync(Guid tokenId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_refresh_token_by_id",
			new { p_token_id = tokenId },
			cancellationToken);
		var dto = await connection.QuerySingleOrDefaultAsync<RefreshTokenDto>(command);

		return dto?.MapToRefreshToken();
	}

	public async Task<IList<RefreshToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_active_refresh_tokens_by_user",
			new { p_user_id = userId },
			cancellationToken);
		var dtos = await connection.QueryAsync<RefreshTokenDto>(command);

		return dtos.Select(dto => dto.MapToRefreshToken()).ToList();
	}

	public async Task<IList<RefreshToken>> GetAllActiveAsync(CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_all_active_refresh_tokens",
			null,
			cancellationToken);
		var dtos = await connection.QueryAsync<RefreshTokenDto>(command);

		return dtos.Select(dto => dto.MapToRefreshToken()).ToList();
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
				p_family_id = token.FamilyId,
				p_session_started_at = token.SessionStartedAt,
				p_device_label = token.DeviceLabel,
				p_ip_address = token.IpAddress,
			},
			cancellationToken);
		await connection.ExecuteAsync(command);
	}

	public async Task UpdateAsync(RefreshToken token, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.update_revoke_refresh_token",
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
				"identity.update_revoke_refresh_token",
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
					p_family_id = newToken.FamilyId,
					p_session_started_at = newToken.SessionStartedAt,
					p_device_label = newToken.DeviceLabel,
					p_ip_address = newToken.IpAddress,
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

	public async Task RevokeFamilyAsync(Guid familyId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.update_revoke_refresh_token_family",
			new { p_family_id = familyId },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}

	public async Task RevokeAsync(Guid tokenId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.update_revoke_refresh_token",
			new { p_token_id = tokenId },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}

	public async Task RevokeAllForUserExceptAsync(Guid userId, Guid exceptTokenId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.update_revoke_refresh_tokens_for_user_except",
			new { p_user_id = userId, p_except_token_id = exceptTokenId },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}

	public async Task RevokeAllExceptAsync(Guid exceptTokenId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.update_revoke_all_refresh_tokens_except",
			new { p_except_token_id = exceptTokenId },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}
}