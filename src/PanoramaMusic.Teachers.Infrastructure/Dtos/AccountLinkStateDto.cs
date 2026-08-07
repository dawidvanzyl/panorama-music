namespace PanoramaMusic.Teachers.Infrastructure.Dtos;

internal sealed record AccountLinkStateDto(
	string Email,
	bool Has_Teacher_Role,
	bool Is_Linked);