using PanoramaMusic.Students.Application.Commands.Courses;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Courses;

/// <summary>
/// Removes a course from the catalogue. Nothing references a course yet, so
/// there is no in-use rule to guard the delete; the lesson structure it pointed
/// at is seeded reference data and is left untouched.
/// </summary>
public sealed class DeleteCourseHandler(ICourseRepository courseRepository)
{
	public async Task HandleAsync(DeleteCourseCommand command, CancellationToken cancellationToken)
	{
		var course = await courseRepository.GetByIdAsync(command.CourseId, cancellationToken)
			?? throw new EntityNotFoundException($"Course {command.CourseId} was not found.");

		course.MarkDeleted();

		await courseRepository.DeleteAsync(course, cancellationToken);
	}
}