using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IInviteTokenRepository
{
	Task<InviteToken?> GetByTokenHashAsync(string tokenHash);
	Task AddAsync(InviteToken token);
	Task UpdateAsync(InviteToken token);
}