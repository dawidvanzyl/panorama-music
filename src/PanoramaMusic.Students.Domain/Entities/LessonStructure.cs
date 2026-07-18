using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Entities;

public record LessonStructure(
	Guid LessonStructureId,
	LessonType LessonType,
	DurationType DurationType,
	OccurrenceType OccurrenceType);