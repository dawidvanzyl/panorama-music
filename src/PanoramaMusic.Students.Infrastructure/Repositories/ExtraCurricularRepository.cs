using Dapper;
using Npgsql;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Interfaces;
using PanoramaMusic.Students.Domain.Messages;
using PanoramaMusic.Students.Infrastructure.Dtos;
using PanoramaMusic.Students.Infrastructure.Extensions;
using PanoramaMusic.Students.Infrastructure.Repositories.Bases;

namespace PanoramaMusic.Students.Infrastructure.Repositories;

public class ExtraCurricularRepository(IUnitOfWork unitOfWork, IDomainEventCollector domainEventCollector)
	: RepositoryBase(unitOfWork), IExtraCurricularRepository
{
	private const string _uniqueViolationSqlState = "23505";
	private const string _descriptionPhaseUniqueConstraint = "uq_extra_curriculars_description_phase";

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

	public async Task<ExtraCurricular?> GetByIdAsync(Guid extraCurricularId, CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.get_extra_curricular_by_id",
			new { p_extra_curricular_id = extraCurricularId },
			Transaction,
			cancellationToken);
		var dtos = await Connection.QueryAsync<ExtraCurricularPracticeTimeDto>(command);

		return dtos.MapToExtraCurriculars().SingleOrDefault();
	}

	public async Task<bool> ExistsInPhaseAsync(
		string description,
		PhaseType phase,
		Guid? excludingExtraCurricularId,
		CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.extra_curricular_exists_in_phase",
			new
			{
				p_description = description,
				p_phase = phase.ToString(),
				p_excluding_extra_curricular_id = excludingExtraCurricularId,
			},
			Transaction,
			cancellationToken);

		return await Connection.ExecuteScalarAsync<bool>(command);
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

		await ExecuteTranslatingDuplicateDescriptionAsync(command, extraCurricular);

		// The aggregate root is what carries the pending events, so this is where
		// they are drained. The collected event still holds this instance, whose
		// practice times are populated, so the audit record names them all.
		domainEventCollector.Collect(extraCurricular);
	}

	public async Task UpdateAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken)
	{
		// The practice times are deliberately absent: an edit reaches the
		// description and the phase and nothing else.
		var command = CreateCommandDefinition(
			"students.update_extra_curricular",
			new
			{
				p_extra_curricular_id = extraCurricular.ExtraCurricularId,
				p_description = extraCurricular.Description,
				p_phase = extraCurricular.Phase.ToString(),
			},
			Transaction,
			cancellationToken);

		await ExecuteTranslatingDuplicateDescriptionAsync(command, extraCurricular);

		domainEventCollector.Collect(extraCurricular);
	}

	public async Task DeleteAsync(ExtraCurricular extraCurricular, CancellationToken cancellationToken)
	{
		// The practice times go with the activity through the cascade on
		// extra_curricular_practice_times, so this stays a single delete.
		var command = CreateCommandDefinition(
			"students.delete_extra_curricular",
			new { p_extra_curricular_id = extraCurricular.ExtraCurricularId },
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(extraCurricular);
	}

	/// <summary>
	/// One slot. The activity and its slots are separate single-purpose writes
	/// sequenced by the handler, and the request's ambient transaction is what
	/// makes them atomic. On the create path the drain below is a no-op — the
	/// activity's own write already took its event.
	/// </summary>
	public async Task CreatePracticeTimeAsync(
		ExtraCurricular extraCurricular,
		ExtraCurricularPracticeTime practiceTime,
		CancellationToken cancellationToken)
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

		domainEventCollector.Collect(extraCurricular);
	}

	/// <summary>
	/// One slot, removed from the activity that owns it. Whether it may go at all
	/// is the aggregate's rule and has already been answered by the time this runs.
	/// </summary>
	public async Task DeletePracticeTimeAsync(
		ExtraCurricular extraCurricular,
		ExtraCurricularPracticeTime practiceTime,
		CancellationToken cancellationToken)
	{
		var command = CreateCommandDefinition(
			"students.delete_extra_curricular_practice_time",
			new
			{
				p_practice_time_id = practiceTime.PracticeTimeId,
				p_extra_curricular_id = practiceTime.ExtraCurricularId,
			},
			Transaction,
			cancellationToken);

		await Connection.ExecuteAsync(command);

		domainEventCollector.Collect(extraCurricular);
	}

	/// <summary>
	/// Two requests can both pass the use case's read before either writes; the
	/// unique constraint over description and phase is what actually settles it.
	/// Translating that into the same refusal the read would have produced keeps
	/// the loser of the race on the 400 path instead of an unexplained 500.
	/// </summary>
	private async Task ExecuteTranslatingDuplicateDescriptionAsync(
		CommandDefinition command,
		ExtraCurricular extraCurricular)
	{
		try
		{
			await Connection.ExecuteAsync(command);
		}
		catch (PostgresException ex) when (IsDuplicateDescription(ex))
		{
			throw new DomainException(ExtraCurricularMessages.DuplicateDescription(
				extraCurricular.Phase.ToString(), extraCurricular.Description));
		}
	}

	private static bool IsDuplicateDescription(PostgresException exception) =>
		exception.SqlState == _uniqueViolationSqlState
		&& exception.ConstraintName == _descriptionPhaseUniqueConstraint;
}