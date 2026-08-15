using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.Courses;

/// <summary>
/// Optional query-string narrowing of the course list. An omitted filter leaves
/// that dimension unfiltered; several supplied together combine.
/// </summary>
public sealed record GetCoursesRequest(
	CourseType? CourseType,
	LessonType? LessonType,
	DurationType? DurationType,
	OccurrenceType? OccurrenceType);
