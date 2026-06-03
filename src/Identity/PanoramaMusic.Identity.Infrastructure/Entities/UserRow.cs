namespace PanoramaMusic.Identity.Infrastructure.Entities;

internal sealed record UserRow(
	Guid User_id,
	string Email,
	string? Password_hash,
	bool Is_active,
	DateTime Created_at);