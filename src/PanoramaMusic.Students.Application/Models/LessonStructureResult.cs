using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

public sealed record LessonStructureResult(
	Guid LessonStructureId,
	LessonType LessonType,
	DurationType DurationType,
	OccurrenceType OccurrenceType);