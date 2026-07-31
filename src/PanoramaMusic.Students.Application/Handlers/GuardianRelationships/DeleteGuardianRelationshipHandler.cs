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

		await guardianRelationshipRepository.DeleteAsync(relationship, cancellationToken);
	}
}