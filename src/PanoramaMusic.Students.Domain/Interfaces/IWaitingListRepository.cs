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

	/// <summary>
	/// One entry by its own identifier, carrying the student and lesson
	/// structure it was read back with, or null when no such entry exists.
	/// Unlike <see cref="GetAllAsync"/> this does not exclude an enrolled
	/// student: the caller has named a specific row, and hiding it would only
	/// turn an editable entry into a silent not-found.
	/// </summary>
	Task<WaitingListEntry?> GetByIdAsync(Guid waitingListEntryId, CancellationToken cancellationToken);

	/// <summary>
	/// The entry a student holds, or null when they hold none — which is what
	/// distinguishes a waiting-list student from any other, and so what the
	/// removal path checks before touching the student record.
	/// </summary>
	Task<WaitingListEntry?> GetByStudentIdAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// Persists a corrected entry. Only the lesson structure, instrument type
	/// and notes are written — the added date-time is not part of the update at
	/// all, so no request can move a row up the queue.
	/// </summary>
	Task UpdateAsync(WaitingListEntry entry, CancellationToken cancellationToken);

	Task DeleteAsync(WaitingListEntry entry, CancellationToken cancellationToken);
}