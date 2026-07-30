using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.Guardians;

public sealed class GetGuardianRelationshipsHandler(IGuardianRelationshipRepository guardianRelationshipRepository)
{
	public async Task<IList<GuardianRelationshipResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var relationships = await guardianRelationshipRepository.GetAllAsync(cancellationToken);

		return [.. relationships.Select(relationship => relationship.ToResult())];
	}
}