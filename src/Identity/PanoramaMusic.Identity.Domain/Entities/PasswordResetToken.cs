namespace PanoramaMusic.Identity.Domain.Entities;

public record PasswordResetToken(Guid TokenId, Guid UserId, string TokenHash, DateTime ExpiresAt)
{
	public DateTime? UsedAt { get; private set; }

	public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
	public bool IsUsed => UsedAt.HasValue;

	public void MarkUsed(DateTime? usedAt = null) => UsedAt = usedAt ?? DateTime.UtcNow;
}