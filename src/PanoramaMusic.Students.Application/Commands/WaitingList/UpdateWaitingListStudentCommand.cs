using PanoramaMusic.Students.Application.Requests.Students;

namespace PanoramaMusic.Students.Application.Commands.WaitingList;

/// <summary>
/// A waiting-list student's own details, corrected from the wizard's Student
/// tab. It carries the same request the Students screen's own edit does — the
/// fields being corrected are the student's, not the waiting list's — and is a
/// distinct command only because reaching them through the waiting list is a
/// Coordinator's to do, where the roster's own update is a Teacher's.
/// </summary>
public sealed record UpdateWaitingListStudentCommand(Guid StudentId, UpdateStudentRequest Request);