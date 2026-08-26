namespace PanoramaMusic.Students.Application.Commands.StudentExtraCurriculars;

public sealed record RemoveExtraCurricularCommand(Guid StudentId, Guid ExtraCurricularId);
