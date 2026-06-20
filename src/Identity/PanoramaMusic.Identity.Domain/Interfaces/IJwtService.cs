using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IJwtService
{
	JwtToken GenerateToken(Guid userId, IList<Role> roles);
}