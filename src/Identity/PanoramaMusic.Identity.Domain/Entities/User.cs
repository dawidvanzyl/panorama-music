using PanoramaMusic.Identity.Domain.ValueObjects;

namespace PanoramaMusic.Identity.Domain.Entities;

public record User(Guid UserId, Email Email, DateTime CreatedAt)
{
	public PasswordHash? PasswordHash { get; private set; }
	public bool IsActive { get; private set; }

	public void SetPassword(PasswordHash hash) => PasswordHash = hash;

	public void Activate() => IsActive = true;
}