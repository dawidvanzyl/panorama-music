using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.StudentCourses;

/// <summary>
/// Every member is nullable so an omitted value is distinguishable from a valid
/// one, rather than binding to an enum's first member or the default date. The
/// instrument type and step are genuinely optional — which of them a request
/// must carry is decided by the chosen course's type, so that rule is enforced
/// by the domain rather than by this shape.
/// </summary>
public sealed record EnrollStudentRequest(
	Guid? CourseId,
	Guid? TeacherId,
	InstrumentType? InstrumentType,
	StepType? StepType,
	DateOnly? EnrolledDate);