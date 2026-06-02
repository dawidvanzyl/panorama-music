using PanoramaMusic.Identity.Domain.Exceptions;

namespace PanoramaMusic.Identity.Domain.Entities;

public record InviteToken(Guid TokenId, Guid UserId, string TokenHash, DateTime ExpiresAt)
{
    public DateTime? UsedAt { get; private set; }

    public bool IsExpired => DateTime.UtcNow >= ExpiresAt;
    public bool IsUsed => UsedAt.HasValue;

    public void MarkUsed()
    {
        if (IsExpired)
			throw new DomainException("Cannot mark an expired invite token as used.");

        if (IsUsed)
			throw new DomainException("Invite token has already been used.");

        UsedAt = DateTime.UtcNow;
	}
}
