using Moq;
using Npgsql;
using NpgsqlTypes;
using PanoramaMusic.Persistence.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Infrastructure.Repositories;
using PanoramaMusic.Students.Tests.Factories;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// What the extra-curricular write functions actually leave behind in real
/// Postgres. The handler tests assert the calls a use case makes; these assert
/// that a practice time survives the round trip as a day plus a time of day —
/// which no application code can prove on its own, because the loss would happen
/// in the column type.
/// </summary>
public class ExtraCurricularFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	private readonly StudentsDatabaseFixture _fixture;

	public ExtraCurricularFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "275UC7")]
	public async Task CreateExtraCurricularPracticeTime_DayAndStartTime_RoundTripUnchangedWithNoDateComponent()
	{
		var activityId = await GivenActivityAsync("Marimba Band", "Senior");
		// A leading zero and non-round minutes: both are where a time really
		// being carried as a timestamp, or reformatted through a locale, goes
		// wrong.
		var startTime = new TimeOnly(7, 30);

		await CallAsync(
			"SELECT students.create_extra_curricular_practice_time(@p_practice_time_id, @p_extra_curricular_id, @p_day, @p_start_time);",
			("p_practice_time_id", Guid.NewGuid()),
			("p_extra_curricular_id", activityId),
			("p_day", "Wednesday"),
			("p_start_time", startTime));

		var (day, readBack, columnType) = await ReadSlotAsync(activityId);

		ShouldlyHelpers.Satisfy(
			() => day.ShouldBe("Wednesday"),
			() => readBack.ShouldBe(startTime),
			// The column itself carries no date, so nothing downstream can leak
			// one — a `timestamp` here would satisfy the equality above and still
			// put 1970-01-01 on the wire.
			() => columnType.ShouldBe("time without time zone"));
	}

	[Fact]
	[Trait("AC", "275UC6")]
	public async Task GetExtraCurriculars_ByPhase_ReturnsOnlyThatPhaseWithEverySlotOfEachActivity()
	{
		var seniorId = await GivenActivityAsync($"Senior Band {Guid.NewGuid()}", "Senior");
		var juniorId = await GivenActivityAsync($"Junior Choir {Guid.NewGuid()}", "Junior");
		await GivenSlotAsync(seniorId, "Monday", new TimeOnly(16, 0));
		await GivenSlotAsync(seniorId, "Friday", new TimeOnly(14, 0));
		await GivenSlotAsync(juniorId, "Monday", new TimeOnly(16, 0));

		var seniorRows = await CountRowsAsync("Senior", seniorId);
		var juniorRowsUnderSenior = await CountRowsAsync("Senior", juniorId);
		var juniorRowsUnfiltered = await CountRowsAsync(null, juniorId);

		ShouldlyHelpers.Satisfy(
			// One row per slot, so both of the Senior activity's slots come back
			// in the one query rather than a lookup per activity.
			() => seniorRows.ShouldBe(2),
			() => juniorRowsUnderSenior.ShouldBe(0),
			// The same day and start time on a different activity is untouched by
			// the uniqueness rule, which is scoped to one activity.
			() => juniorRowsUnfiltered.ShouldBe(1));
	}

	[Fact]
	[Trait("AC", "276UC3")]
	public async Task GetExtraCurricularById_TwoActivitiesSharingADayAndStartTime_ReturnsBothWithTheirOwnSlots()
	{
		var alphaId = await GivenActivityAsync($"Alpha {Guid.NewGuid()}", "Junior");
		var betaId = await GivenActivityAsync($"Beta {Guid.NewGuid()}", "Senior");
		// The same pair on both. If the uniqueness rule had been written as a
		// catalogue-wide constraint rather than a per-activity one, the second
		// insert would throw here rather than failing an assertion below.
		await GivenSlotAsync(alphaId, "Wednesday", new TimeOnly(13, 0));
		await GivenSlotAsync(alphaId, "Monday", new TimeOnly(8, 0));
		await GivenSlotAsync(betaId, "Wednesday", new TimeOnly(13, 0));

		var alphaSlots = await ReadSlotsAsync(alphaId);
		var betaSlots = await ReadSlotsAsync(betaId);

		ShouldlyHelpers.Satisfy(
			() => alphaSlots.ShouldBe(["Wednesday 13:00", "Monday 08:00"], ignoreOrder: true),
			// Beta kept its own copy of the shared pair, and read-by-id returns the
			// slots of the activity asked for and no others.
			() => betaSlots.ShouldBe(["Wednesday 13:00"]));
	}

	[Fact]
	[Trait("AC", "278UC5")]
	public async Task DeleteExtraCurricular_ActivityWithSeveralSlots_TakesEveryOneOfThemWithIt()
	{
		var activityId = await GivenActivityAsync($"Recorder Ensemble {Guid.NewGuid()}", "Junior");
		await GivenSlotAsync(activityId, "Monday", new TimeOnly(15, 0));
		await GivenSlotAsync(activityId, "Thursday", new TimeOnly(15, 0));

		await CallAsync(
			"SELECT students.delete_extra_curricular(@p_extra_curricular_id);",
			("p_extra_curricular_id", activityId));

		var remainingSlots = await CountSlotRowsAsync(activityId);
		var remainingActivities = await CountActivityRowsAsync(activityId);

		ShouldlyHelpers.Satisfy(
			() => remainingActivities.ShouldBe(0),
			// No orphan: the slots are gone from their own table, not merely
			// unreachable through an absent activity.
			() => remainingSlots.ShouldBe(0));
	}

	[Fact]
	[Trait("AC", "278UC29")]
	public async Task CreateAsync_DescriptionAlreadyHeldInThatPhase_TranslatesTheUniqueViolationIntoTheRefusal()
	{
		var description = $"Choir {Guid.NewGuid()}";
		// The read both requests would have made is deliberately skipped: this is
		// the state a race leaves behind, where the constraint is all that is left
		// to settle it.
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);
		var repository = RepositoryOver(transaction);

		await repository.CreateAsync(
			ExtraCurricularFactory.Create(Guid.NewGuid(), description, PhaseType.Junior),
			TestContext.Current.CancellationToken);

		var exception = await Should.ThrowAsync<DomainException>(async () => await repository.CreateAsync(
			ExtraCurricularFactory.Create(Guid.NewGuid(), description, PhaseType.Junior),
			TestContext.Current.CancellationToken));

		// The loser of the race gets the refusal a read would have produced, not
		// an unexplained failure.
		exception.Message.ShouldBe($"Junior already has an activity called \"{description}\".");

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	[Fact]
	[Trait("AC", "278UC29")]
	public async Task CreateAsync_SameDescriptionInTheOtherPhase_IsNotRefused()
	{
		var description = $"Choir {Guid.NewGuid()}";
		await using var transaction = await _fixture.Connection.BeginTransactionAsync(TestContext.Current.CancellationToken);
		var repository = RepositoryOver(transaction);

		await repository.CreateAsync(
			ExtraCurricularFactory.Create(Guid.NewGuid(), description, PhaseType.Junior),
			TestContext.Current.CancellationToken);

		// The constraint is scoped to the pair, so the other phase is untouched by
		// it — the rule is not a catalogue-wide one.
		await Should.NotThrowAsync(async () => await repository.CreateAsync(
			ExtraCurricularFactory.Create(Guid.NewGuid(), description, PhaseType.Senior),
			TestContext.Current.CancellationToken));

		await transaction.RollbackAsync(TestContext.Current.CancellationToken);
	}

	/// <summary>
	/// The real repository over the fixture's connection and the given
	/// transaction. Only the repository can be under test here: the translation it
	/// performs needs a genuine Postgres constraint violation to translate.
	/// </summary>
	private ExtraCurricularRepository RepositoryOver(NpgsqlTransaction transaction)
	{
		var unitOfWork = new Mock<IUnitOfWork>();
		unitOfWork.SetupGet(u => u.Connection).Returns(_fixture.Connection);
		unitOfWork.SetupGet(u => u.Transaction).Returns(transaction);

		return new ExtraCurricularRepository(unitOfWork.Object, Mock.Of<IDomainEventCollector>());
	}

	private Task<long> CountSlotRowsAsync(Guid activityId) =>
		ScalarAsync(
			"SELECT COUNT(*) FROM students.extra_curricular_practice_times WHERE extra_curricular_id = @id;",
			activityId);

	private Task<long> CountActivityRowsAsync(Guid activityId) =>
		ScalarAsync(
			"SELECT COUNT(*) FROM students.extra_curriculars WHERE extra_curricular_id = @id;",
			activityId);

	private async Task<long> ScalarAsync(string sql, Guid activityId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = sql;
		select.Parameters.AddWithValue("id", activityId);

		return (long)(await select.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
	}

	/// <summary>Every slot the read-by-id function returns for one activity, as it reads to a person.</summary>
	private async Task<List<string>> ReadSlotsAsync(Guid activityId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = """
			SELECT day, start_time
			FROM students.get_extra_curricular_by_id(@p_extra_curricular_id);
			""";
		select.Parameters.AddWithValue("p_extra_curricular_id", activityId);

		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);

		var slots = new List<string>();
		while (await reader.ReadAsync(TestContext.Current.CancellationToken))
		{
			slots.Add($"{reader.GetString(0)} {reader.GetFieldValue<TimeOnly>(1):HH\\:mm}");
		}

		return slots;
	}

	private async Task<Guid> GivenActivityAsync(string description, string phase)
	{
		var activityId = Guid.NewGuid();

		await CallAsync(
			"SELECT students.create_extra_curricular(@p_extra_curricular_id, @p_description, @p_phase);",
			("p_extra_curricular_id", activityId),
			("p_description", description),
			("p_phase", phase));

		return activityId;
	}

	private Task GivenSlotAsync(Guid activityId, string day, TimeOnly startTime) =>
		CallAsync(
			"SELECT students.create_extra_curricular_practice_time(@p_practice_time_id, @p_extra_curricular_id, @p_day, @p_start_time);",
			("p_practice_time_id", Guid.NewGuid()),
			("p_extra_curricular_id", activityId),
			("p_day", day),
			("p_start_time", startTime));

	private async Task<(string Day, TimeOnly StartTime, string ColumnType)> ReadSlotAsync(Guid activityId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = """
			SELECT pt.day,
			       pt.start_time,
			       (SELECT data_type
			        FROM information_schema.columns
			        WHERE table_schema = 'students'
			          AND table_name = 'extra_curricular_practice_times'
			          AND column_name = 'start_time')
			FROM students.extra_curricular_practice_times pt
			WHERE pt.extra_curricular_id = @extra_curricular_id;
			""";
		select.Parameters.AddWithValue("extra_curricular_id", activityId);

		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);
		(await reader.ReadAsync(TestContext.Current.CancellationToken)).ShouldBeTrue();

		return (reader.GetString(0), reader.GetFieldValue<TimeOnly>(1), reader.GetString(2));
	}

	/// <summary>How many listing rows the read function returns for one activity.</summary>
	private async Task<long> CountRowsAsync(string? phase, Guid activityId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = """
			SELECT COUNT(*)
			FROM students.get_extra_curriculars(@p_phase)
			WHERE extra_curricular_id = @extra_curricular_id;
			""";
		select.Parameters.Add(new NpgsqlParameter("p_phase", NpgsqlDbType.Text)
		{
			Value = (object?)phase ?? DBNull.Value,
		});
		select.Parameters.AddWithValue("extra_curricular_id", activityId);

		return (long)(await select.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
	}

	private async Task CallAsync(string sql, params (string Name, object? Value)[] parameters)
	{
		await using var command = _fixture.Connection.CreateCommand();
		command.CommandText = sql;
		foreach (var (name, value) in parameters)
		{
			command.Parameters.Add(new NpgsqlParameter(name, value ?? DBNull.Value));
		}

		await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
	}
}