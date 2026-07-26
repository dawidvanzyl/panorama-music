using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Domain.Interfaces;

public interface IGuardianRelationshipRepository
{
	Task<IList<GuardianRelationship>> GetAllAsync(CancellationToken cancellationToken);

	Task<GuardianRelationship?> GetByIdAsync(Guid guardianRelationshipId, CancellationToken cancellationToken);
}