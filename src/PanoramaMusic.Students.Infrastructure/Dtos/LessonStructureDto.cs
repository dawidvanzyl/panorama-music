namespace PanoramaMusic.Students.Infrastructure.Dtos;

internal sealed record LessonStructureDto(
	Guid Lesson_Structure_Id,
	string Lesson_Type,
	string Duration_Type,
	string Occurrence_Type);