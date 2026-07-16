namespace PanoramaMusic.Identity.Infrastructure.Dtos;

internal sealed record InviteTokenDto(
	Guid Token_Id,
	Guid User_Id,
	string Token_Hash,
	DateTime Expires_At,
	DateTime? Used_At);