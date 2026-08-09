namespace PanoramaMusic.Teachers.Application.Requests.Teachers;

/// <summary>
/// The employment classification is maintained on its own, independently of the
/// profile names. IsPrivate true means the teacher is paid directly by parents;
/// false means paid by the school.
/// </summary>
public sealed record UpdateTeacherClassificationRequest(bool IsPrivate);