using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Courses;

public sealed class GetCoursesHandler(ICourseRepository courseRepository)
{
	public async Task<IList<CourseResult>> HandleAsync(GetCoursesRequest request, CancellationToken cancellationToken)
	{
		var filter = new CourseFilter(
			request.CourseType,
			request.LessonType,
			request.DurationType,
			request.OccurrenceType);

		var courses = await courseRepository.GetAllAsync(filter, cancellationToken);

		return [.. courses.Select(course => course.ToResult())];
	}
}
