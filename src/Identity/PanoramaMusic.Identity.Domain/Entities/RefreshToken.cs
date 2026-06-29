namespace PanoramaMusic.Identity.Domain.Entities;

public record RefreshToken(Guid TokenId, Guid UserId, string TokenHash, DateTime ExpiresAt, Guid FamilyId, DateTime SessionStartedAt)
{
	public DateTime? RevokedAt { get; private set; }

	public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
	public bool IsRevoked => RevokedAt.HasValue;

	public bool IsSessionExpired(TimeSpan absoluteSessionLifetime) => DateTime.UtcNow >= SessionStartedAt.Add(absoluteSessionLifetime);

	public void Revoke(DateTime? revokedAt = null) => RevokedAt = revokedAt ?? DateTime.UtcNow;
}