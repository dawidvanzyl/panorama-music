using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IWaitingListRepository
{
	/// <summary>
	/// Every waiting-list entry, each carrying the student and lesson structure
	/// it was read back with. A student holding a course enrollment is excluded —
	/// they are not a waiting-list student regardless of what row this table
	/// still holds for them. Grouping by occurrence type, ordering by date-time
	/// added, and deriving each entry's queue position are this list's caller's
	/// concern, not this read's.
	/// </summary>
	Task<IList<WaitingListEntry>> GetAllAsync(CancellationToken cancellationToken);

	/// <summary>
	/// Persists a captured entry. A student who already holds one fails on the
	/// table's own unique constraint rather than a pre-check here — the same
	/// reasoning <c>IStudentCourseRepository.CreateAsync</c> leaves a duplicate
	/// enrollment to its own constraint.
	/// </summary>
	Task CreateAsync(WaitingListEntry entry, CancellationToken cancellationToken);
}