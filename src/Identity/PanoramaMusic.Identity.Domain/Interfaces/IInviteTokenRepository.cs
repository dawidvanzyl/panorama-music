using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IInviteTokenRepository
{
	Task<InviteToken?> GetByTokenHashAsync(string tokenHash, CancellationToken cancellationToken = default);
	Task AddAsync(InviteToken token, CancellationToken cancellationToken = default);
	Task UpdateAsync(InviteToken token, CancellationToken cancellationToken = default);
}