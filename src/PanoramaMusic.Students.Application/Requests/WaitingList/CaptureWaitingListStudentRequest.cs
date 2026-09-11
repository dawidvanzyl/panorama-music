using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.WaitingList;

/// <summary>
/// Captures a student and their single waiting-list entry together. It names
/// no course — which course a student ends up in is settled at enrolment, a
/// later story's concern — and carries no added-date: that is assigned from
/// the server clock, never taken from the request.
/// <para>
/// <see cref="LessonStructureId"/> and <see cref="InstrumentType"/> are
/// nullable so an omitted value is distinguishable from a valid one and can be
/// rejected by the validator, rather than binding to a Guid's default or an
/// enum's first member — the same reasoning <c>CreateCourseRequest</c> follows.
/// </para>
/// </summary>
public sealed record CaptureWaitingListStudentRequest(
	string FirstName,
	string LastName,
	DateOnly DateOfBirth,
	GradeType Grade,
	ClassType? Class,
	PhaseType? Phase,
	Language Language,
	Guid? LessonStructureId,
	InstrumentType? InstrumentType,
	string? Notes);