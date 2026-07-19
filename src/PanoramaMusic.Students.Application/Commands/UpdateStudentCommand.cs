using PanoramaMusic.Students.Application.Requests;

namespace PanoramaMusic.Students.Application.Commands;

public sealed record UpdateStudentCommand(Guid StudentId, UpdateStudentRequest Request);