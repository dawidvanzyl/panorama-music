using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IInviteTokenRepository
{
	Task<InviteToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken);
	Task AddAsync(InviteToken token, CancellationToken cancellationToken);
	Task UpdateAsync(InviteToken token, CancellationToken cancellationToken);
	Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken);
	Task RevokeAndIssueAsync(Guid userId, InviteToken newToken, CancellationToken cancellationToken);
}