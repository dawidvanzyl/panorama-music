namespace PanoramaMusic.Teachers.Infrastructure.Dtos;

internal sealed record LinkableAccountDto(
	Guid Account_Id,
	string Email);