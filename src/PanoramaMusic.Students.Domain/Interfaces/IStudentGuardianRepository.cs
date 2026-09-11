using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IStudentGuardianRepository
{
	Task<IList<Guardian>> GetGuardiansByStudentIdAsync(Guid studentId, CancellationToken cancellationToken);

	Task<int> GetLinkCountAsync(Guid guardianId, CancellationToken cancellationToken);

	/// <summary>
	/// Whether this guardian is linked to any student who holds a course
	/// enrollment. A guardian is one row shared across a sibling group, so an
	/// edit of one of these changes what an enrolled student depends on.
	/// </summary>
	Task<bool> HasEnrolledLinkAsync(Guid guardianId, CancellationToken cancellationToken);

	/// <summary>
	/// Whether every student linked to this guardian is a waiting-list student.
	/// The guardian endpoints name a guardian with no student in scope, so this
	/// is what says which surface reached it. Stricter than
	/// <see cref="HasEnrolledLinkAsync"/>: a roster student who is not enrolled
	/// yet has no enrolled link either, and their guardian is still the roster's.
	/// </summary>
	Task<bool> BelongsToWaitingListOnlyAsync(Guid guardianId, CancellationToken cancellationToken);

	/// <summary>
	/// Of the guardians reachable from this student — their own and their
	/// siblings' — those linked to at least one enrolled student. One query
	/// rather than a per-guardian lookup over the list being rendered.
	/// </summary>
	Task<IList<Guid>> GetEnrolledLinkedGuardianIdsAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// Guardians linked to any of the student's siblings but not to the
	/// student itself — the set a "Sync Guardians" action would add.
	/// </summary>
	Task<IList<Guardian>> GetMissingSiblingGuardiansAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// The links that would give each of this student's enrolled siblings every
	/// guardian the student holds — one row per link that does not exist yet.
	/// Siblings still on the waiting list are not included; a guardian reaches
	/// them when it is added, and only an enrolled sibling is ever held back
	/// from.
	/// </summary>
	Task<IList<MissingGuardianLink>> GetMissingEnrolledSiblingLinksAsync(Guid studentId, CancellationToken cancellationToken);

	Task CreateAsync(StudentGuardian link, CancellationToken cancellationToken);

	Task DeleteAsync(StudentGuardian link, CancellationToken cancellationToken);
}