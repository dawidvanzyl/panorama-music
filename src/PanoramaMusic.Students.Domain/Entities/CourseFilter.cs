using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// Optional narrowing of the course list. A null dimension is left unfiltered,
/// so several set together narrow the result by all of them at once.
/// </summary>
public sealed record CourseFilter(
	CourseType? CourseType,
	LessonType? LessonType,
	DurationType? DurationType,
	OccurrenceType? OccurrenceType)
{
	public static readonly CourseFilter None = new(null, null, null, null);
}