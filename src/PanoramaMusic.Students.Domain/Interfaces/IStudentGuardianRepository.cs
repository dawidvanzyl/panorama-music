using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IStudentGuardianRepository
{
	Task<IList<Guardian>> GetGuardiansByStudentIdAsync(Guid studentId, CancellationToken cancellationToken);

	Task<int> GetLinkCountAsync(Guid guardianId, CancellationToken cancellationToken);

	/// <summary>
	/// Guardians linked to any of the student's siblings but not to the
	/// student itself — the set a "Sync Guardians" action would add.
	/// </summary>
	Task<IList<Guardian>> GetMissingSiblingGuardiansAsync(Guid studentId, CancellationToken cancellationToken);

	Task CreateAsync(StudentGuardian link, CancellationToken cancellationToken);

	Task DeleteAsync(StudentGuardian link, CancellationToken cancellationToken);
}