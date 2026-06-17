using PanoramaMusic.Identity.Domain.Exceptions;

namespace PanoramaMusic.Identity.Domain.Entities;

public record PasswordResetToken(Guid TokenId, Guid UserId, string TokenHash, DateTime ExpiresAt, DateTime? UsedAt = null)
{
	public DateTime? UsedAt { get; private set; } = UsedAt;

	public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
	public bool IsUsed => UsedAt.HasValue;

	public void MarkUsed()
	{
		if (IsExpired)
			throw new InvalidResetTokenException("Password reset token has expired.");

		if (IsUsed)
			throw new InvalidResetTokenException("Password reset token has already been used.");

		UsedAt = DateTime.UtcNow;
	}
}