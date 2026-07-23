using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface ISiblingRepository
{
	Task<IList<Student>> GetSiblingsAsync(Guid studentId, CancellationToken cancellationToken);

	Task AddAsync(Sibling sibling, CancellationToken cancellationToken);

	Task DeleteAsync(Sibling sibling, CancellationToken cancellationToken);
}