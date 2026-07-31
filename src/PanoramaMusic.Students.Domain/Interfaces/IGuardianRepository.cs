using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IGuardianRepository
{
	Task<Guardian?> GetByIdAsync(Guid guardianId, CancellationToken cancellationToken);

	/// <summary>
	/// How many guardians currently reference a relationship type — the
	/// "in use" test that governs whether that type may be deleted.
	/// </summary>
	Task<int> CountByRelationshipAsync(Guid guardianRelationshipId, CancellationToken cancellationToken);

	Task CreateAsync(Guardian guardian, CancellationToken cancellationToken);

	Task UpdateAsync(Guardian guardian, CancellationToken cancellationToken);

	Task DeleteAsync(Guardian guardian, CancellationToken cancellationToken);
}