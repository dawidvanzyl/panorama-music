using Dapper;
using Npgsql;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
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

		await ExecuteRespectingNameUniquenessAsync(command, guardianRelationship);

		domainEventCollector.Collect(guardianRelationship);
	}

	public async Task UpdateAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.update_guardian_relationship",
			ToParameters(guardianRelationship),
			Transaction,
			cancellationToken);

		await ExecuteRespectingNameUniquenessAsync(command, guardianRelationship);

		domainEventCollector.Collect(guardianRelationship);
	}

	/// <summary>
	/// The handlers pre-check the name, but two concurrent writes can both pass
	/// that check and leave the case-insensitive unique index to reject one of
	/// them. Translating the violation keeps that race on the same 400 the
	/// pre-check produces instead of an unhandled 500.
	/// </summary>
	private async Task ExecuteRespectingNameUniquenessAsync(CommandDefinition command, GuardianRelationship guardianRelationship)
	{
		try
		{
			await Connection.ExecuteAsync(command);
		}
		catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
		{
			throw new DomainException($"A guardian relationship named '{guardianRelationship.Name}' already exists.");
		}
	}

	public async Task DeleteAsync(GuardianRelationship guardianRelationship, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_guardian_relationship",
			new { p_guardian_relationship_id = guardianRelationship.GuardianRelationshipId },
			Transaction,
			cancellationToken);

		try
		{
			await Connection.ExecuteAsync(command);
		}
		catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.ForeignKeyViolation)
		{
			// A guardian was assigned to this type after the handler's in-use
			// check and before this delete. Surfaced as the same rejection the
			// check produces rather than an unhandled 500.
			throw new DomainException($"Guardian relationship '{guardianRelationship.Name}' is assigned to a guardian and cannot be deleted.");
		}

		domainEventCollector.Collect(guardianRelationship);
	}

	private static object ToParameters(GuardianRelationship guardianRelationship) =>
		new
		{
			p_guardian_relationship_id = guardianRelationship.GuardianRelationshipId,
			p_name = guardianRelationship.Name,
		};
}