namespace PanoramaMusic.Identity.Infrastructure.Entities;

internal sealed record RefreshTokenRow(
	Guid Token_id,
	Guid User_id,
	string Token_hash,
	DateTime Expires_at,
	DateTime? Revoked_at);