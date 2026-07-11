using Dapper;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Infrastructure.Dtos;
using PanoramaMusic.Identity.Infrastructure.Extensions;
using PanoramaMusic.Identity.Infrastructure.Repositories.Bases;
using PanoramaMusic.Persistence.Transactions;

namespace PanoramaMusic.Identity.Infrastructure.Repositories;

public class PasswordResetTokenRepository(IUnitOfWork unitOfWork) : RepositoryBase(unitOfWork), IPasswordResetTokenRepository
{
	public async Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.get_password_reset_token_by_hash",
			new { p_token_hash = tokenHash },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<PasswordResetTokenDto>(command);

		return dto?.MapToPasswordResetToken();
	}

	public async Task CreateAsync(PasswordResetToken token, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"identity.create_password_reset_token",
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
			"identity.update_use_password_reset_token",
			new { p_token_id = tokenId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}
}