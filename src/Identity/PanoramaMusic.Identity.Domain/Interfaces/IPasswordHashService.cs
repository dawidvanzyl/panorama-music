using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IPasswordHashService
{
	PasswordHash Hash(string password);
	bool Verify(string password, PasswordHash hash);
}