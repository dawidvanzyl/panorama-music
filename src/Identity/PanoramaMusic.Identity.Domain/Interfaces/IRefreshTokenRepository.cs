using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IRefreshTokenRepository
{
	Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken);
	Task<RefreshToken?> GetByTokenIdAsync(Guid tokenId, CancellationToken cancellationToken);
	Task<IList<RefreshToken>> GetActiveByUserIdAsync(Guid userId, CancellationToken cancellationToken);
	Task<IList<RefreshToken>> GetAllActiveAsync(CancellationToken cancellationToken);
	Task<IList<SessionWithOwner>> GetAllActiveWithOwnerAsync(CancellationToken cancellationToken);
	Task AddAsync(RefreshToken token, CancellationToken cancellationToken);
	Task UpdateAsync(RefreshToken token, CancellationToken cancellationToken);
	Task RotateAsync(Guid oldTokenId, RefreshToken newToken, CancellationToken cancellationToken);
	Task RevokeFamilyAsync(Guid familyId, CancellationToken cancellationToken);
	Task RevokeAsync(Guid tokenId, RevokedAccessToken? accessTokenToRevoke, CancellationToken cancellationToken);
	Task RevokeAllForUserExceptAsync(Guid userId, Guid exceptTokenId, IReadOnlyList<RevokedAccessToken> accessTokensToRevoke, CancellationToken cancellationToken);
	Task RevokeAllExceptAsync(Guid exceptTokenId, IReadOnlyList<RevokedAccessToken> accessTokensToRevoke, CancellationToken cancellationToken);
}