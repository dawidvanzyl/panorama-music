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
	/// One enrollment with its course and lesson structure already resolved, or
	/// null when the student holds no enrollment under that identifier. Addressed
	/// by the student as well as by its own id, exactly as the route addresses
	/// it, so one student's enrollment is never reached through another's.
	/// </summary>
	Task<StudentCourse?> GetByIdAsync(Guid studentId, Guid studentCourseId, CancellationToken cancellationToken);

	/// <summary>
	/// How many courses the student is enrolled in — the condition that blocks
	/// withdrawing their last one. A count rather than a read of every row, since
	/// the caller only needs the number.
	/// </summary>
	Task<int> CountByStudentIdAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// Persists the enrollment and, when the course type records one, the
	/// instrument and step that go with it.
	/// </summary>
	Task CreateAsync(StudentCourse enrollment, CancellationToken cancellationToken);

	/// <summary>
	/// Persists the corrected teacher and the instrument and step the enrollment
	/// now records, replacing whatever it recorded before.
	/// </summary>
	Task UpdateAsync(StudentCourse enrollment, CancellationToken cancellationToken);

	/// <summary>
	/// Removes the enrollment, and with it the instrument and step recorded
	/// against it.
	/// </summary>
	Task DeleteAsync(StudentCourse enrollment, CancellationToken cancellationToken);
}