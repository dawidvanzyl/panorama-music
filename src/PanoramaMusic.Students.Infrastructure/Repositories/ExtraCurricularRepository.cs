using Dapper;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class ExtraCurricularRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IExtraCurricularRepository
{
	public async Task<IList<ExtraCurricular>> GetAllAsync(PhaseType? phase, CancellationToken cancellationToken)
	{
		// The function joins the practice times itself, so the whole list arrives
		// resolved in this one round trip rather than a slot lookup per activity.
		var command = CreateCommandDefinition(
			"students.get_extra_curriculars",
			new { p_phase = phase?.ToString() },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<ExtraCurricularPracticeTimeDto>(command);

		return dtos.MapToExtraCurriculars();
	}

	public async Task CreateAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_extra_curricular",
			new
			{
				p_extra_curricular_id = extraCurricular.ExtraCurricularId,
				p_description = extraCurricular.Description,
				p_phase = extraCurricular.Phase.ToString(),
			},
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);

		// The aggregate root is what carries the pending events, so this is where
		// they are drained — the slot writes below are child rows and raise none
		// of their own. The collected event still holds this instance, whose
		// practice times are populated, so the audit record names them all.
		domainEventCollector.Collect(extraCurricular);
	}

	/// <summary>
	/// One slot. The activity and its slots are separate single-purpose writes
	/// sequenced by the handler, and the request's ambient transaction is what
	/// makes them atomic.
	/// </summary>
	public async Task CreatePracticeTimeAsync(ExtraCurricularPracticeTime practiceTime, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.create_extra_curricular_practice_time",
			new
			{
				p_practice_time_id = practiceTime.PracticeTimeId,
				p_extra_curricular_id = practiceTime.ExtraCurricularId,
				p_day = practiceTime.Day.ToString(),
				p_start_time = practiceTime.StartTime,
			},
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);
	}
}