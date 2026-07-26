using Dapper;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

/// <summary>
/// Read-only access to the seeded guardian_relationships lookup (#4).
/// Maintaining the lookup is a separate story; this context only consumes it.
/// </summary>
public class GuardianRelationshipRepository(IUnitOfWork unitOfWork)
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
}