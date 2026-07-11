namespace PanoramaMusic.Identity.Infrastructure.Dtos;

internal sealed record UserDto(
	Guid User_Id,
	string Email,
	string? Password_Hash,
	bool Is_Active,
	DateTime Created_At,
	bool Requires_Password_Reset);