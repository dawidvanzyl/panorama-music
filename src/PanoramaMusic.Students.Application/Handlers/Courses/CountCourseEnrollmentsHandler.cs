using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Courses;

/// <summary>
/// A course is in use once any student is enrolled in it, which is exactly the
/// condition that blocks deletion. Lets the maintenance screen tell the user up
/// front instead of offering a delete that must then fail.
/// </summary>
public sealed class CountCourseEnrollmentsHandler(
	ICourseRepository courseRepository,
	IStudentCourseRepository studentCourseRepository)
{
	public async Task<CountCourseEnrollmentsResult> HandleAsync(Guid courseId, CancellationToken cancellationToken)
	{
		_ = await courseRepository.GetByIdAsync(courseId, cancellationToken)
			?? throw new EntityNotFoundException($"Course {courseId} was not found.");

		var enrolledStudents = await studentCourseRepository.CountByCourseAsync(courseId, cancellationToken);
		return new CountCourseEnrollmentsResult(enrolledStudents);
	}
}