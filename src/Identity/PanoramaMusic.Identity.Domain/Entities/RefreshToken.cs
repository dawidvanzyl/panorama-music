namespace PanoramaMusic.Identity.Domain.Entities;

public record RefreshToken(Guid TokenId, Guid UserId, string TokenHash, DateTime ExpiresAt)
{
	public DateTime? RevokedAt { get; private set; }

	public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
	public bool IsRevoked => RevokedAt.HasValue;

	public void Revoke(DateTime? revokedAt = null) => RevokedAt = revokedAt ?? DateTime.UtcNow;
}