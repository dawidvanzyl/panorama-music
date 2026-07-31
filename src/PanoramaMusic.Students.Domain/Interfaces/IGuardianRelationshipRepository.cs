using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IGuardianRelationshipRepository
{
	Task<IList<GuardianRelationship>> GetAllAsync(CancellationToken cancellationToken);

	Task<GuardianRelationship?> GetByIdAsync(Guid guardianRelationshipId, CancellationToken cancellationToken);

	Task<GuardianRelationship?> GetByNameAsync(string name, CancellationToken cancellationToken);

	Task CreateAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken);

	Task UpdateAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken);

	Task DeleteAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken);
}