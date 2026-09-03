using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class WaitingListRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IWaitingListRepository
{
	public async Task<IList<WaitingListEntry>> GetAllAsync(CancellationToken cancellationToken)
	{
		// The function joins the student and lesson structure itself, so the whole
		// list arrives resolved in this one round trip rather than a lookup per
		// entry, and excludes any student who already holds a course enrollment.
		var command = CreateCommandDefinition(
			"students.get_waiting_list",
			null,
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<WaitingListEntryDto>(command);

		return [.. dtos.Select(dto => dto.MapToWaitingListEntry())];
	}

	public async Task CreateAsync(WaitingListEntry entry, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_waiting_list_entry",
			new
			{
				p_waiting_list_entry_id = entry.WaitingListEntryId,
				p_student_id = entry.Student.StudentId,
				p_lesson_structure_id = entry.LessonStructure.LessonStructureId,
				p_instrument_type = entry.InstrumentType.ToString(),
				p_notes = entry.Notes,
				p_added_at = entry.AddedAt,
			},
			Transaction,
			cancellationToken);
		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(entry);
	}
}