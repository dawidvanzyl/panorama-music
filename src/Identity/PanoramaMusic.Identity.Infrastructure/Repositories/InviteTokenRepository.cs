using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class InviteTokenRepository(IUnitOfWork unitOfWork) : RepositoryBase(unitOfWork), IInviteTokenRepository
{
	public async Task<InviteToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_invite_token_by_hash",
			new { p_token_hash = tokenHash },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<InviteTokenDto>(command);

		return dto?.MapToInviteToken();
	}

	public async Task CreateAsync(InviteToken token, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.create_invite_token",
			new
			{
				p_token_id = token.TokenId,
				p_user_id = token.UserId,
				p_token_hash = token.TokenHash,
				p_expires_at = token.ExpiresAt,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task UseAsync(Guid tokenId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_use_invite_token",
			new { p_token_id = tokenId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	public async Task RevokeForUserAsync(Guid userId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.update_revoke_invite_tokens_for_user",
			new { p_user_id = userId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}
}