using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.GuardianRelationships;

/// <summary>
/// A relationship type is in use once any guardian references it, which is
/// exactly the condition that blocks deletion. Lets the maintenance screen
/// tell the user up front instead of offering a delete that must then fail.
/// </summary>
public sealed class CountGuardianRelationshipHandler(
	IGuardianRelationshipRepository guardianRelationshipRepository,
	IGuardianRepository guardianRepository)
{
	public async Task<CountGuardianRelationshipResult> HandleAsync(Guid guardianRelationshipId, CancellationToken cancellationToken)
	{
		_ = await guardianRelationshipRepository.GetByIdAsync(guardianRelationshipId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian relationship {guardianRelationshipId} was not found.");

		var guardiansUsingType = await guardianRepository.CountByRelationshipAsync(guardianRelationshipId, cancellationToken);
		return new CountGuardianRelationshipResult(guardiansUsingType);
	}
}