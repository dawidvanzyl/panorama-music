using PanoramaMusic.Students.Application.Commands.GuardianRelationships;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.GuardianRelationships;

/// <summary>
/// Deletes a relationship type, but only while no guardian references it —
/// a type in use stays available and must be renamed instead.
/// </summary>
public sealed class DeleteGuardianRelationshipHandler(
	IGuardianRelationshipRepository guardianRelationshipRepository,
	IGuardianRepository guardianRepository)
{
	public async Task HandleAsync(DeleteGuardianRelationshipCommand command, CancellationToken cancellationToken)
	{
		var relationship = await guardianRelationshipRepository.GetByIdAsync(command.GuardianRelationshipId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian relationship {command.GuardianRelationshipId} was not found.");

		var guardiansUsingType = await guardianRepository.CountByRelationshipAsync(command.GuardianRelationshipId, cancellationToken);
		if (guardiansUsingType > 0)
			throw new DomainException($"Guardian relationship '{relationship.Name}' is assigned to {guardiansUsingType} guardian(s) and cannot be deleted.");

		relationship.MarkDeleted();

		// The repository's delete carries the same in-use guard as a single atomic
		// statement, so a guardian assigned between the count above and here is
		// still refused rather than failing on the foreign key.
		var deleted = await guardianRelationshipRepository.DeleteAsync(relationship, cancellationToken);
		if (!deleted)
			throw new DomainException($"Guardian relationship '{relationship.Name}' was assigned to a guardian and cannot be deleted.");
	}
}