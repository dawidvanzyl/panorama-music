using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Domain.Interfaces;

public interface IPasswordHashService
{
	PasswordHash Hash(string password);
	bool Verify(string password, PasswordHash hash);

	/// <summary>
	/// A fixed, valid-shaped hash that never matches a real password. Used to run a
	/// full verification computation on paths with no real password to check against,
	/// so response timing doesn't reveal whether an account exists or is active.
	/// </summary>
	PasswordHash DummyHash { get; }
}