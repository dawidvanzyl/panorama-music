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
	/// Whether the student already holds an enrollment in the course — a
	/// membership test rather than a read of every enrollment they hold.
	/// </summary>
	Task<bool> ExistsByStudentAndCourseAsync(Guid studentId, Guid courseId, CancellationToken cancellationToken);

	/// <summary>
	/// How many students are enrolled in the course — the condition that blocks
	/// deleting it.
	/// </summary>
	Task<int> CountByCourseIdAsync(Guid courseId, CancellationToken cancellationToken);

	/// <summary>
	/// Persists the enrollment and, when the course type records one, the
	/// instrument and step that go with it.
	/// </summary>
	Task CreateAsync(StudentCourse enrollment, CancellationToken cancellationToken);
}