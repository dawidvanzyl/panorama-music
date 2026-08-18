using PanoramaMusic.Students.Application.Commands.Courses;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Courses;

/// <summary>
/// Removes a course from the catalogue, but only while no student is enrolled in
/// it — an enrolled course stays available and its cost is corrected instead.
/// The lesson structure it pointed at is seeded reference data and is left
/// untouched either way.
/// </summary>
public sealed class DeleteCourseHandler(
	ICourseRepository courseRepository,
	IStudentCourseRepository studentCourseRepository)
{
	public async Task HandleAsync(DeleteCourseCommand command, CancellationToken cancellationToken)
	{
		var course = await courseRepository.GetByIdAsync(command.CourseId, cancellationToken)
			?? throw new EntityNotFoundException($"Course {command.CourseId} was not found.");

		var enrolledStudents = await studentCourseRepository.CountByCourseIdAsync(command.CourseId, cancellationToken);
		if (enrolledStudents > 0)
			throw new DomainException($"Course '{course}' has {enrolledStudents} enrolled student(s) and cannot be deleted.");

		course.MarkDeleted();

		await courseRepository.DeleteAsync(course, cancellationToken);
	}
}