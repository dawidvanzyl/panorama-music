using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface ICourseRepository
{
	/// <summary>
	/// Every course with its lesson structure already resolved, read in a single
	/// query rather than a structure lookup per course.
	/// </summary>
	Task<IList<Course>> GetAllAsync(CancellationToken cancellationToken);

	/// <summary>The course with its lesson structure resolved, or null when it does not exist.</summary>
	Task<Course?> GetByIdAsync(Guid courseId, CancellationToken cancellationToken);

	/// <summary>
	/// The course of this type delivered under this lesson structure, or null
	/// where the school offers none. A type and a structure together identify at
	/// most one course, so a caller that knows both needs no choice made for it.
	/// </summary>
	Task<Course?> GetByTypeAndStructureAsync(
		CourseType courseType,
		Guid lessonStructureId,
		CancellationToken cancellationToken);

	Task CreateAsync(Course course, CancellationToken cancellationToken);

	Task UpdateCostAsync(Course course, CancellationToken cancellationToken);

	Task DeleteAsync(Course course, CancellationToken cancellationToken);
}