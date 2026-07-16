namespace PanoramaMusic.Identity.Application.Models;

public sealed record SessionResult(
	Guid TokenId,
	DateTime SessionStartedAt,
	DateTime LastSeenAt,
	DateTime ExpiresAt,
	string? DeviceLabel,
	string? IpAddress,
	bool IsCurrent);