using PanoramaMusic.Students.Application.Commands.Courses;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Handlers.Courses;

public sealed class CreateCourseHandler(
	ICourseRepository courseRepository,
	ILessonStructureRepository lessonStructureRepository)
{
	public async Task<CourseResult> HandleAsync(CreateCourseCommand command, CancellationToken cancellationToken)
	{
		// The validator has already rejected an absent value, so the request's
		// nullable members are populated by the time the use case runs.
		var request = command.Request;
		var lessonStructureId = request.LessonStructureId!.Value;

		var lessonStructure = await lessonStructureRepository.GetByIdAsync(lessonStructureId, cancellationToken)
			?? throw new DomainException($"Lesson structure '{lessonStructureId}' does not exist.");

		var courseType = request.CourseType!.Value;

		var existing = await courseRepository.GetByTypeAndStructureAsync(courseType, lessonStructureId, cancellationToken);
		if (existing is not null)
		{
			throw new EntityAlreadyExistsException(CourseMessages.AlreadyExists);
		}

		var course = Course.Create(Guid.NewGuid(), courseType, request.Cost!.Value, lessonStructure);

		await courseRepository.CreateAsync(course, cancellationToken);

		return course.ToResult();
	}
}