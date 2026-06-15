using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Factories;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class InviteTokenRepository(IDbConnectionFactory connectionFactory) : RepositoryBase(connectionFactory), IInviteTokenRepository
{
	public async Task<InviteToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.get_invite_token_by_hash",
			new { p_token_hash = tokenHash },
			cancellationToken);
		var dto = await connection.QuerySingleOrDefaultAsync<InviteTokenDto>(command);

		return dto?.MapToInviteToken();
	}

	public async Task AddAsync(InviteToken token, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.create_invite_token",
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

	public async Task UpdateAsync(InviteToken token, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.use_invite_token",
			new { p_token_id = token.TokenId },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}

	public async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken)
	{
		using var connection = CreateConnection();
		var command = CreateCommandDefinition(
			"identity.revoke_invite_tokens_for_user",
			new { p_user_id = userId },
			cancellationToken);
		await connection.ExecuteAsync(command);
	}
}