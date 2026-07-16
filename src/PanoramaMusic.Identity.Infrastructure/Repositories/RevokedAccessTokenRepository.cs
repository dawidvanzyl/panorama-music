using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class RevokedAccessTokenRepository(IUnitOfWork unitOfWork) : RepositoryBase(unitOfWork), IRevokedAccessTokenRepository
{
	public async Task DeleteExpiredAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.delete_expired_revoked_access_tokens",
			null,
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task CreateAsync(RevokedAccessToken token, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.create_revoked_access_token",
			new
			{
				p_jti = token.Jti,
				p_expires_at = token.ExpiresAt,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task CreateManyAsync(IReadOnlyList<RevokedAccessToken> tokens, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.create_revoked_access_tokens",
			new
			{
				p_tokens = tokens.Select(t => new RevokedAccessTokenInputDto(t.Jti, t.ExpiresAt)).ToArray(),
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task<bool> ExistsAsync(Guid jti, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_revoked_access_token_by_jti",
			new { p_jti = jti },
			Transaction,
			cancellationToken);
		var result = await Connection.QuerySingleOrDefaultAsync<Guid?>(command);

		return result.HasValue;
	}
}