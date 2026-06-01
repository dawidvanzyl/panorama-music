using PanoramaMusic.Identity.Domain.Entities;

namespace PanoramaMusic.Identity.Domain.Common;

public interface IInviteTokenRepository
{
    Task<InviteToken?> GetByTokenHashAsync(string tokenHash);
    Task AddAsync(InviteToken token);
    Task UpdateAsync(InviteToken token);
}
