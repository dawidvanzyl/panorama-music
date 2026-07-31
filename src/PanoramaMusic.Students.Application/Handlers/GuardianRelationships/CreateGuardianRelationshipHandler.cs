using PanoramaMusic.Students.Application.Commands.GuardianRelationships;
using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.GuardianRelationships;

public sealed class CreateGuardianRelationshipHandler(IGuardianRelationshipRepository guardianRelationshipRepository)
{
	public async Task<GuardianRelationshipResult> HandleAsync(CreateGuardianRelationshipCommand command, CancellationToken cancellationToken)
	{
		var name = command.Request.Name.Trim();

		var existing = await guardianRelationshipRepository.GetByNameAsync(name, cancellationToken);
		if (existing is not null)
			throw new DomainException($"A guardian relationship named '{name}' already exists.");

		var relationship = GuardianRelationship.Create(Guid.NewGuid(), name);

		await guardianRelationshipRepository.CreateAsync(relationship, cancellationToken);

		return relationship.ToResult();
	}
}