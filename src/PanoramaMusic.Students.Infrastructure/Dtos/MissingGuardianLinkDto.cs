namespace PanoramaMusic.Students.Infrastructure.Dtos;

internal sealed record MissingGuardianLinkDto(
	Guid Sibling_Id,
	Guid Guardian_Id);