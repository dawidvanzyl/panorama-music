using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.StudentCourses;

/// <summary>
/// What an enrollment may be corrected to: a different teacher, and the
/// instrument type and step its course type records. The course and the enrolled
/// date are settled at enrollment and so are absent from this shape entirely.
/// <para>
/// Every member is nullable so an omitted value is distinguishable from a valid
/// one. Which of the instrument type and step this request must carry is decided
/// by the enrollment's course type, so that rule is enforced by the domain
/// rather than by this shape.
/// </para>
/// </summary>
public sealed record UpdateEnrollmentRequest(
	Guid? TeacherId,
	InstrumentType? InstrumentType,
	StepType? StepType);