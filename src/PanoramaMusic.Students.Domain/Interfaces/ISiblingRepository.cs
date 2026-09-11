using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface ISiblingRepository
{
	Task<IList<Student>> GetSiblingsAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// This student's siblings as the Siblings tab shows them, each carrying the
	/// listing they belong to. A sibling group can span both listings — one child
	/// enrolled, another still waiting — so each sibling's state is read with
	/// them rather than inferred from the student they were reached through, or
	/// from the screen the group is being read on.
	/// </summary>
	Task<IList<SiblingStudent>> GetSiblingStudentsAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// The ids of this student's siblings who hold a course enrollment, for a
	/// caller that must treat an enrolled sibling differently from a waiting
	/// one.
	/// </summary>
	Task<IList<Guid>> GetEnrolledSiblingIdsAsync(Guid studentId, CancellationToken cancellationToken);

	Task AddAsync(Sibling sibling, CancellationToken cancellationToken);

	Task DeleteAsync(Sibling sibling, CancellationToken cancellationToken);
}