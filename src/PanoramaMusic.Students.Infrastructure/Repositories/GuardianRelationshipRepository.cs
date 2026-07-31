using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class GuardianRelationshipRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IGuardianRelationshipRepository
{
	public async Task<IList<GuardianRelationship>> GetAllAsync(CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition("students.get_guardian_relationships", null, Transaction, cancellationToken);
		var dtos = await Connection.QueryAsync<GuardianRelationshipDto>(command);

		return [.. dtos.Select(dto => dto.MapToGuardianRelationship())];
	}

	public async Task<GuardianRelationship?> GetByIdAsync(Guid guardianRelationshipId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_guardian_relationship_by_id",
			new { p_guardian_relationship_id = guardianRelationshipId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<GuardianRelationshipDto>(command);

		return dto?.MapToGuardianRelationship();
	}

	public async Task<GuardianRelationship?> GetByNameAsync(string name, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_guardian_relationship_by_name",
			new { p_name = name },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<GuardianRelationshipDto>(command);

		return dto?.MapToGuardianRelationship();
	}

	public async Task CreateAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_guardian_relationship",
			ToParameters(guardianRelationship),
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(guardianRelationship);
	}

	public async Task UpdateAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.update_guardian_relationship",
			ToParameters(guardianRelationship),
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(guardianRelationship);
	}

	public async Task<bool> DeleteAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_guardian_relationship",
			new { p_guardian_relationship_id = guardianRelationship.GuardianRelationshipId },
			Transaction,
			cancellationToken);
		var deletedCount = await Connection.QuerySingleAsync<int>(command);

		if (deletedCount == 0)
			return false;

		domainEventCollector.Collect(guardianRelationship);
		return true;
	}

	private static object ToParameters(GuardianRelationship guardianRelationship) =>
		new
		{
			p_guardian_relationship_id = guardianRelationship.GuardianRelationshipId,
			p_name = guardianRelationship.Name,
		};
}