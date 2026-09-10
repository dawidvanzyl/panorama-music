using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.WaitingList;

/// <summary>
/// What an enrolment off the waiting list carries. It names a lesson structure
/// rather than a course: an entry records an intended instrument, and only an
/// instrument course records one, so the course a waiting student is waiting for
/// follows from the structure and is resolved rather than chosen.
/// <para>
/// The occurrence type is not a field. It is fixed at the entry, and the
/// structure named here is checked against it — a structure carrying a different
/// one is refused rather than silently honoured.
/// </para>
/// <para>
/// The instrument type and the step are required, unlike the roster's own
/// enrollment request where the chosen course type decides: an instrument course
/// records both, and that is the only course type reachable through here.
/// </para>
/// </summary>
public sealed record EnrolWaitingListStudentRequest(
	Guid? LessonStructureId,
	Guid? TeacherId,
	InstrumentType? InstrumentType,
	StepType? StepType,
	DateOnly? EnrolledDate);