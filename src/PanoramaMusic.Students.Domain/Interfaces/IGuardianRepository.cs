using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IGuardianRepository
{
	Task<Guardian?> GetByIdAsync(Guid guardianId, CancellationToken cancellationToken);

	Task CreateAsync(Guardian guardian, CancellationToken cancellationToken);

	Task UpdateAsync(Guardian guardian, CancellationToken cancellationToken);

	Task DeleteAsync(Guardian guardian, CancellationToken cancellationToken);
}