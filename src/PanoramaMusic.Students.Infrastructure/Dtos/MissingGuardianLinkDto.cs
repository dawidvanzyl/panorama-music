namespace PanoramaMusic.Students.Infrastructure.Dtos;

internal sealed record MissingGuardianLinkDto(
	Guid Student_Id,
	Guid Guardian_Id);
