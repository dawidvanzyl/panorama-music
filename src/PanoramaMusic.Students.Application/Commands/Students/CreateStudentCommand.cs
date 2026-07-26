using PanoramaMusic.Students.Application.Requests.Students;

namespace PanoramaMusic.Students.Application.Commands.Students;

public sealed record CreateStudentCommand(CreateStudentRequest Request);