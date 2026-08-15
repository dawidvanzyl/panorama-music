using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Entities;

public record LessonStructure(
	Guid LessonStructureId,
	LessonType LessonType,
	DurationType DurationType,
	OccurrenceType OccurrenceType)
{
	/// <summary>
	/// The three dimensions that describe the structure, in the order a reader
	/// expects them. Audit targets name a structure this way rather than
	/// spelling the three members out at each call site.
	/// </summary>
	public override string ToString() => $"{LessonType} · {DurationType} · {OccurrenceType}";
}
