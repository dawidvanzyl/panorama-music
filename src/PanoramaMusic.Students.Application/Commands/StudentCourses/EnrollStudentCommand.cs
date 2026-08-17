using PanoramaMusic.Students.Application.Requests.StudentCourses;

namespace PanoramaMusic.Students.Application.Commands.StudentCourses;

public sealed record EnrollStudentCommand(Guid StudentId, EnrollStudentRequest Request);