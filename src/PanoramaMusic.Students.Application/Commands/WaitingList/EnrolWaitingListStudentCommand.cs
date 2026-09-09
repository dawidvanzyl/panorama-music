using PanoramaMusic.Students.Application.Requests.StudentCourses;

namespace PanoramaMusic.Students.Application.Commands.WaitingList;

/// <summary>
/// Carries the roster's own <see cref="EnrollStudentRequest"/> rather than a
/// waiting-list copy of it: the fields an enrollment needs are the same
/// whichever screen it was started from, and the one thing that differs — the
/// occurrence type being fixed at the entry — is a rule the handler enforces
/// against the chosen course, not an extra field on the request.
/// </summary>
public sealed record EnrolWaitingListStudentCommand(Guid StudentId, EnrollStudentRequest Request);