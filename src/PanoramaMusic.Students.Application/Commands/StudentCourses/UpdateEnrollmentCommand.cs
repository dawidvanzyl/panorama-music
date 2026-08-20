using PanoramaMusic.Students.Application.Requests.StudentCourses;

namespace PanoramaMusic.Students.Application.Commands.StudentCourses;

public sealed record UpdateEnrollmentCommand(Guid StudentId, Guid StudentCourseId, UpdateEnrollmentRequest Request);