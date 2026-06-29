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
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.create_revoked_access_token",
			new
			{
				p_jti = token.Jti,
				p_expires_at = token.ExpiresAt,
			},
			cancellationToken);
		await connection.ExecuteAsync(command);
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