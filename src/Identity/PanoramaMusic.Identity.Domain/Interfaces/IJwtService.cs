using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IJwtService
{
    string GenerateToken(Guid userId, IList<Role> roles);
}
