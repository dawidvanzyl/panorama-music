using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RefreshTokenRepository(IUnitOfWork unitOfWork) : RepositoryBase(unitOfWork), IRefreshTokenRepository
{
	public async Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_refresh_token_by_hash",
			new { p_token_hash = tokenHash },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<RefreshTokenDto>(command);

		return dto?.MapToRefreshToken();
	}

	public async Task<RefreshToken?> GetByTokenIdAsync(Guid tokenId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_refresh_token_by_id",
			new { p_token_id = tokenId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<RefreshTokenDto>(command);

		return dto?.MapToRefreshToken();
	}

	public async Task<IList<RefreshToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_active_refresh_tokens_by_user",
			new { p_user_id = userId },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<RefreshTokenDto>(command);

		return dtos.Select(dto => dto.MapToRefreshToken()).ToList();
	}

	public async Task<IList<RefreshToken>> GetAllActiveAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_all_active_refresh_tokens",
			null,
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<RefreshTokenDto>(command);

		return dtos.Select(dto => dto.MapToRefreshToken()).ToList();
	}

	public async Task<IList<SessionWithOwner>> GetAllActiveWithOwnerAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_all_active_sessions_with_owner",
			null,
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<SessionWithOwnerDto>(command);

		return dtos.Select(dto => dto.MapToSessionWithOwner()).ToList();
	}

	public async Task CreateAsync(RefreshToken token, CancellationToken cancellationToken)
	{
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
				p_access_token_jti = token.AccessTokenJti,
				p_access_token_expires_at = token.AccessTokenExpiresAt,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task RevokeAsync(Guid tokenId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_revoke_refresh_token",
			new { p_token_id = tokenId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task RevokeFamilyAsync(Guid familyId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_revoke_refresh_token_family",
			new { p_family_id = familyId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_revoke_all_refresh_tokens",
			new { p_user_id = userId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task RevokeAllForUserExceptAsync(Guid userId, Guid exceptTokenId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_revoke_refresh_tokens_for_user_except",
			new
			{
				p_user_id = userId,
				p_except_token_id = exceptTokenId
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task RevokeAllExceptAsync(Guid exceptTokenId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_revoke_all_refresh_tokens_except",
			new { p_except_token_id = exceptTokenId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}
}