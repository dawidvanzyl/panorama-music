using PanoramaMusic.Students.Application.Requests.WaitingList;

namespace PanoramaMusic.Students.Application.Commands.WaitingList;

/// <summary>
/// An enrolment reached from the waiting list. It carries the waiting list's own
/// request rather than the roster's: the two differ in the one place that
/// matters, which is that this one names a lesson structure and lets the course
/// be resolved from it.
/// </summary>
public sealed record EnrolWaitingListStudentCommand(Guid StudentId, EnrolWaitingListStudentRequest Request);