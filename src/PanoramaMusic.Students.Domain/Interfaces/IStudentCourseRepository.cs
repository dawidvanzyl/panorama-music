using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IStudentCourseRepository
{
	/// <summary>
	/// The student's enrollments with each one's course and lesson structure
	/// already resolved, read in a single query rather than a course lookup per
	/// enrollment. Empty when the student holds none.
	/// </summary>
	Task<IList<StudentCourse>> GetByStudentIdAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// How many students are enrolled in the course — the condition that blocks
	/// deleting it.
	/// </summary>
	Task<int> CountByCourseAsync(Guid courseId, CancellationToken cancellationToken);

	/// <summary>
	/// Persists the enrollment and, when the course type records one, the
	/// instrument and step that go with it.
	/// </summary>
	Task CreateAsync(StudentCourse enrollment, CancellationToken cancellationToken);
}