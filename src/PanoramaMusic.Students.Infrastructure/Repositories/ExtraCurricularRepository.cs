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

	/// <summary>
	/// The activity and each of its slots are separate single-purpose writes, run
	/// inside the request's ambient transaction — so they commit together without
	/// any one function taking on more than a single insert.
	/// </summary>
	public async Task CreateAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken)
	{
		var createActivity = CreateCommandDefinition(
			"students.create_extra_curricular",
			new
			{
				p_extra_curricular_id = extraCurricular.ExtraCurricularId,
				p_description = extraCurricular.Description,
				p_phase = extraCurricular.Phase.ToString(),
			},
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(createActivity);

		foreach (var practiceTime in extraCurricular.PracticeTimes)
		{
			var createPracticeTime = CreateCommandDefinition(
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

			await Connection.ExecuteAsync(createPracticeTime);
		}

		domainEventCollector.Collect(extraCurricular);
	}
}
