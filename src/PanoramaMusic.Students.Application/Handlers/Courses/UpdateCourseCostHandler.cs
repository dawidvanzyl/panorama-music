using PanoramaMusic.Students.Application.Commands.Courses;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Courses;

/// <summary>
/// Corrects a course's price. The course type and the lesson structure it is
/// delivered under are settled at creation, so neither is reachable from here.
/// </summary>
public sealed class UpdateCourseCostHandler(ICourseRepository courseRepository)
{
	public async Task<CourseResult> HandleAsync(UpdateCourseCostCommand command, CancellationToken cancellationToken)
	{
		var course = await courseRepository.GetByIdAsync(command.CourseId, cancellationToken)
			?? throw new EntityNotFoundException($"Course {command.CourseId} was not found.");

		// The validator has already rejected an absent value.
		course.UpdateCost(command.Request.Cost!.Value);

		await courseRepository.UpdateCostAsync(course, cancellationToken);

		return course.ToResult();
	}
}