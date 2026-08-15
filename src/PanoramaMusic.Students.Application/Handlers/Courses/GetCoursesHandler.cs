using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Courses;

public sealed class GetCoursesHandler(ICourseRepository courseRepository)
{
	public async Task<IList<CourseResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var courses = await courseRepository.GetAllAsync(cancellationToken);

		return [.. courses.Select(course => course.ToResult())];
	}
}
