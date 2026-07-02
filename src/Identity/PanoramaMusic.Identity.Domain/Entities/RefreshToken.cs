namespace PanoramaMusic.Identity.Domain.Entities;

public record RefreshToken(Guid TokenId, Guid UserId, string TokenHash, DateTime ExpiresAt, Guid FamilyId, DateTime SessionStartedAt, string? DeviceLabel, string? IpAddress)
{
	public DateTime? RevokedAt { get; private set; }
	public DateTime LastSeenAt { get; private set; } = SessionStartedAt;

	public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
	public bool IsRevoked => RevokedAt.HasValue;

	public bool IsSessionExpired(TimeSpan absoluteSessionLifetime) => DateTime.UtcNow >= SessionStartedAt.Add(absoluteSessionLifetime);

	public void Revoke(DateTime? revokedAt = null) => RevokedAt = revokedAt ?? DateTime.UtcNow;

	public void Touch(DateTime? lastSeenAt = null) => LastSeenAt = lastSeenAt ?? DateTime.UtcNow;
}