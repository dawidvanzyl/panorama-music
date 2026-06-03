using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IPasswordHasher
{
	PasswordHash Hash(string password);
	bool Verify(string password, PasswordHash hash);
}