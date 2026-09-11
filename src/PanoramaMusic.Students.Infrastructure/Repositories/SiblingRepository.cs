using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

/// <summary>
/// A sibling link is one row per direction (see 07__siblings_table.sql), so
/// AddAsync/DeleteAsync each call their single-purpose function twice — once
/// per direction — keeping every SQL function a single write, per backend
/// standards. Both calls share the ambient transaction, so the pair commits
/// or rolls back atomically. Collect is still called only once per method:
/// from the domain's perspective this is one action ("linked A and B" /
/// "unlinked A and B"), so exactly one SiblingAdded/SiblingRemoved event
/// should reach the audit trail, not two.
/// </summary>
public class SiblingRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), ISiblingRepository
{
	public async Task<IList<Student>> GetSiblingsAsync(Guid studentId, CancellationToken cancellationToken) =>
		[.. (await QuerySiblingsAsync(studentId, cancellationToken)).Select(sibling => sibling.Student)];

	public async Task<IList<SiblingStudent>> GetSiblingStudentsAsync(Guid studentId, CancellationToken cancellationToken) =>
		await QuerySiblingsAsync(studentId, cancellationToken);

	public async Task<IList<Guid>> GetEnrolledSiblingIdsAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_enrolled_sibling_ids",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var siblingIds = await Connection.QueryAsync<Guid>(command);

		return [.. siblingIds];
	}

	public async Task AddAsync(Sibling sibling, CancellationToken cancellationToken)
	{
		await CreateDirectionAsync(sibling.StudentId, sibling.SiblingId, cancellationToken);
		await CreateDirectionAsync(sibling.SiblingId, sibling.StudentId, cancellationToken);

		domainEventCollector.Collect(sibling);
	}

	public async Task DeleteAsync(Sibling sibling, CancellationToken cancellationToken)
	{
		await DeleteDirectionAsync(sibling.StudentId, sibling.SiblingId, cancellationToken);
		await DeleteDirectionAsync(sibling.SiblingId, sibling.StudentId, cancellationToken);

		domainEventCollector.Collect(sibling);
	}

	/// <summary>
	/// One query behind both reads: the sibling group and each member's listing
	/// arrive together, and a caller with no use for the listing simply drops it
	/// rather than asking a second, near-identical question of the database.
	/// </summary>
	private async Task<IList<SiblingStudent>> QuerySiblingsAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_siblings",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<SiblingStudentDto>(command);

		return [.. dtos.Select(dto => dto.MapToSiblingStudent())];
	}

	private async Task CreateDirectionAsync(Guid studentId, Guid siblingId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_sibling",
			new { p_student_id = studentId, p_sibling_id = siblingId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}

	private async Task DeleteDirectionAsync(Guid studentId, Guid siblingId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_sibling",
			new { p_student_id = studentId, p_sibling_id = siblingId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);
	}
}