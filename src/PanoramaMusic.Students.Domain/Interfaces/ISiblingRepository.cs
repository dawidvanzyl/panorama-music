using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface ISiblingRepository
{
	Task<IList<Student>> GetSiblingsAsync(Guid studentId, CancellationToken cancellationToken);

	/// <summary>
	/// The ids of this student's siblings who hold a course enrollment, for a
	/// caller that must treat an enrolled sibling differently from a waiting
	/// one.
	/// </summary>
	Task<IList<Guid>> GetEnrolledSiblingIdsAsync(Guid studentId, CancellationToken cancellationToken);

	Task AddAsync(Sibling sibling, CancellationToken cancellationToken);

	Task DeleteAsync(Sibling sibling, CancellationToken cancellationToken);
}