using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IStudentExtraCurricularRepository
{
	/// <summary>
	/// Every activity the student takes part in, each with its practice times
	/// already attached. The function joins the activities and their slots itself,
	/// so the whole list arrives in a single query rather than an activity lookup
	/// per assignment.
	/// </summary>
	Task<IList<StudentExtraCurricular>> GetByStudentIdAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// The activities the student may be assigned to: those offered to their own
	/// phase that they do not already take part in. A student whose phase is not
	/// recorded may be assigned to none, and the query answers that with an empty
	/// list rather than the caller special-casing it.
	/// </summary>
	Task<IList<ExtraCurricular>> GetAssignableAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// Whether the student already takes part in the activity. A membership test
	/// rather than a read of every assignment they hold. The primary key is still
	/// what settles a race between two requests; this only buys the earlier,
	/// better-explained refusal.
	/// </summary>
	Task<bool> ExistsAsync(Guid studentId, Guid extraCurricularId, CancellationToken cancellationToken);

	Task CreateAsync(StudentExtraCurricular assignment, CancellationToken cancellationToken);

	Task DeleteAsync(StudentExtraCurricular assignment, CancellationToken cancellationToken);

	/// <summary>
	/// Every one of the student's assignments, in a single statement rather than a
	/// delete per row. The assignments are passed alongside because they are the
	/// aggregates carrying the pending removal events, so each removal is still
	/// audited individually even though the write is one.
	/// </summary>
	Task DeleteAllByStudentIdAsync(
		Guid studentId,
		IEnumerable<StudentExtraCurricular> assignments,
		CancellationToken cancellationToken);
}