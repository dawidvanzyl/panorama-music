using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IGuardianRelationshipRepository
{
	Task<IList<GuardianRelationship>> GetAllAsync(CancellationToken cancellationToken);

	Task<GuardianRelationship?> GetByIdAsync(Guid guardianRelationshipId, CancellationToken cancellationToken);

	Task<GuardianRelationship?> GetByNameAsync(string name, CancellationToken cancellationToken);

	Task CreateAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken);

	Task UpdateAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken);

	/// <summary>
	/// Deletes the relationship type only while no guardian references it.
	/// Returns whether it was removed — false means a guardian is using it.
	/// </summary>
	Task<bool> DeleteAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken);
}