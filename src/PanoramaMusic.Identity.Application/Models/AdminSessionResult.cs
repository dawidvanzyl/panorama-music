using PanoramaMusic.Identity.Domain.Enums;

namespace PanoramaMusic.Identity.Application.Models;

public sealed record AdminSessionResult(
	Guid TokenId,
	Guid UserId,
	string UserEmail,
	IList<Role> UserRoles,
	DateTime SessionStartedAt,
	DateTime LastSeenAt,
	DateTime ExpiresAt,
	string? DeviceLabel,
	string? IpAddress,
	bool IsCurrent);