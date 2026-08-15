using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.Courses;

/// <summary>
/// Every member is nullable so an omitted value is distinguishable from a valid
/// one and can be rejected by the validator, rather than binding to an enum's
/// first member or a zero cost.
/// </summary>
public sealed record CreateCourseRequest(
	CourseType? CourseType,
	decimal? Cost,
	Guid? LessonStructureId);
