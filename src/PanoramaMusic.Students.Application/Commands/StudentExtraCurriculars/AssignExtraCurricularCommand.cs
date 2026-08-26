using PanoramaMusic.Students.Application.Requests.StudentExtraCurriculars;

namespace PanoramaMusic.Students.Application.Commands.StudentExtraCurriculars;

public sealed record AssignExtraCurricularCommand(Guid StudentId, AssignExtraCurricularRequest Request);
