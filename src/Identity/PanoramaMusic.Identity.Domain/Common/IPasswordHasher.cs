using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Domain.Common;

public interface IPasswordHasher
{
    PasswordHash Hash(string password);
    bool Verify(string password, string hash);
}
