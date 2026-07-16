using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IInviteTokenRepository
{
	Task<InviteToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken);
	Task CreateAsync(InviteToken token, CancellationToken cancellationToken);
	Task UseAsync(Guid tokenId, CancellationToken cancellationToken);
	Task RevokeForUserAsync(Guid userId, CancellationToken cancellationToken);
}