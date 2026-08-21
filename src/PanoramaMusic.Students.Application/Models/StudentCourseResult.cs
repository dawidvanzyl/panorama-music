using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// One enrollment with everything a caller renders alongside it: the course and
/// its lesson structure, the assigned teacher's name, and the instrument and
/// step the course type records. The enum members are the keys that cross the
/// wire — the display text a human reads is the consuming screen's concern.
/// </summary>
public sealed record StudentCourseResult(
	Guid StudentCourseId,
	Guid StudentId,
	Guid CourseId,
	CourseType CourseType,
	Guid LessonStructureId,
	LessonType LessonType,
	DurationType DurationType,
	OccurrenceType OccurrenceType,
	Guid TeacherId,
	string TeacherFirstName,
	string TeacherSurname,
	InstrumentType? InstrumentType,
	StepType? StepType,
	DateOnly EnrolledDate);