using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface ICourseRepository
{
	/// <summary>
	/// Every matching course with its lesson structure already resolved, read in
	/// a single query rather than a structure lookup per course.
	/// </summary>
	Task<IList<Course>> GetAllAsync(CourseFilter filter, CancellationToken cancellationToken);

	Task CreateAsync(Course course, CancellationToken cancellationToken);
}