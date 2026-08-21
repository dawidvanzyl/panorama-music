namespace PanoramaMusic.Students.Application.Commands.StudentCourses;

public sealed record WithdrawEnrollmentCommand(Guid StudentId, Guid StudentCourseId);