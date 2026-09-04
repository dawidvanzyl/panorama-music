using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class StudentGuardianRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IStudentGuardianRepository
{
	public async Task<IList<Guardian>> GetGuardiansByStudentIdAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_guardians_by_student_id",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<GuardianDto>(command);

		return [.. dtos.Select(dto => dto.MapToGuardian())];
	}

	public async Task<int> GetLinkCountAsync(Guid guardianId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_guardian_link_count",
			new { p_guardian_id = guardianId },
			Transaction,
			cancellationToken);

		return await Connection.QuerySingleAsync<int>(command);
	}

	public async Task<bool> HasEnrolledLinkAsync(Guid guardianId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.guardian_has_enrolled_link",
			new { p_guardian_id = guardianId },
			Transaction,
			cancellationToken);

		return await Connection.QuerySingleAsync<bool>(command);
	}

	public async Task<bool> BelongsToWaitingListOnlyAsync(Guid guardianId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.guardian_belongs_to_waiting_list_only",
			new { p_guardian_id = guardianId },
			Transaction,
			cancellationToken);

		return await Connection.QuerySingleAsync<bool>(command);
	}

	public async Task<IList<Guid>> GetEnrolledLinkedGuardianIdsAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_enrolled_linked_guardian_ids",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var guardianIds = await Connection.QueryAsync<Guid>(command);

		return [.. guardianIds];
	}

	public async Task<IList<Guardian>> GetMissingSiblingGuardiansAsync(Guid studentId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_missing_sibling_guardians",
			new { p_student_id = studentId },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<GuardianDto>(command);

		return [.. dtos.Select(dto => dto.MapToGuardian())];
	}

	public async Task CreateAsync(StudentGuardian link, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_student_guardian",
			new { p_student_id = link.StudentId, p_guardian_id = link.GuardianId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(link);
	}

	public async Task DeleteAsync(StudentGuardian link, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_student_guardian",
			new { p_student_id = link.StudentId, p_guardian_id = link.GuardianId },
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(link);
	}
}