using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class GuardianRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IGuardianRepository
{
	public async Task<Guardian?> GetByIdAsync(Guid guardianId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_guardian_by_id",
			new { p_guardian_id = guardianId },
			Transaction,
			cancellationToken);
		var dto = await Connection.QuerySingleOrDefaultAsync<GuardianDto>(command);

		return dto?.MapToGuardian();
	}

	public async Task CreateAsync(Guardian guardian, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_guardian",
			ToParameters(guardian),
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(guardian);
	}

	public async Task UpdateAsync(Guardian guardian, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.update_guardian",
			ToParameters(guardian),
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(guardian);
	}

	public async Task DeleteAsync(Guardian guardian, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_guardian",
			new { p_guardian_id = guardian.GuardianId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(guardian);
	}

	private static object ToParameters(Guardian guardian) =>
		new
		{
			p_guardian_id = guardian.GuardianId,
			p_guardian_relationship_id = guardian.GuardianRelationshipId,
			p_first_name = guardian.FirstName,
			p_surname = guardian.Surname,
			p_cell = guardian.Cell,
			p_email = guardian.Email,
			p_receives_correspondence = guardian.ReceivesCorrespondence,
			p_responsible_for_payment = guardian.ResponsibleForPayment,
			p_married = guardian.Married,
		};
}