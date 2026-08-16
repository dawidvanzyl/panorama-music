using PanoramaMusic.Students.Application.Requests.Courses;

namespace PanoramaMusic.Students.Application.Commands.Courses;

public sealed record UpdateCourseCostCommand(Guid CourseId, UpdateCourseRequest Request);