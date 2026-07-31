using PanoramaMusic.Students.Application.Commands.GuardianRelationships;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.GuardianRelationships;

/// <summary>
/// Renaming is allowed regardless of how many guardians reference the type —
/// only deletion is guarded by the in-use rule.
/// </summary>
public sealed class RenameGuardianRelationshipHandler(IGuardianRelationshipRepository guardianRelationshipRepository)
{
	public async Task<GuardianRelationshipResult> HandleAsync(RenameGuardianRelationshipCommand command, CancellationToken cancellationToken)
	{
		var relationship = await guardianRelationshipRepository.GetByIdAsync(command.GuardianRelationshipId, cancellationToken)
			?? throw new EntityNotFoundException($"Guardian relationship {command.GuardianRelationshipId} was not found.");

		var name = command.Request.Name.Trim();

		var existing = await guardianRelationshipRepository.GetByNameAsync(name, cancellationToken);
		if (existing is not null && existing.GuardianRelationshipId != relationship.GuardianRelationshipId)
			throw new DomainException($"A guardian relationship named '{name}' already exists.");

		relationship.Rename(name);

		await guardianRelationshipRepository.UpdateAsync(relationship, cancellationToken);

		return relationship.ToResult();
	}
}