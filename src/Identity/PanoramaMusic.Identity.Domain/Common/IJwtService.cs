namespace PanoramaMusic.Identity.Domain.Common;

public interface IJwtService
{
    string GenerateToken(Guid userId, IList<Role> roles);
}
