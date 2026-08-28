namespace PanoramaMusic.Students.Application.Requests.StudentExtraCurriculars;

/// <summary>
/// The activity the student is to be assigned to. The student is addressed by the
/// route, and the link carries nothing else of its own.
/// </summary>
public sealed record AssignExtraCurricularRequest(Guid? ExtraCurricularId);