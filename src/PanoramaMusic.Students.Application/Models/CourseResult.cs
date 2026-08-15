using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// A course with the lesson structure detail a caller renders alongside it. The
/// enum members are the keys that cross the wire — the display text a human
/// reads is the consuming screen's concern.
/// </summary>
public sealed record CourseResult(
	Guid CourseId,
	CourseType CourseType,
	decimal Cost,
	Guid LessonStructureId,
	LessonType LessonType,
	DurationType DurationType,
	OccurrenceType OccurrenceType);
