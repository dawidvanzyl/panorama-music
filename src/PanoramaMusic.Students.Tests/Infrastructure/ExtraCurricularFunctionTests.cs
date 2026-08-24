using Npgsql;
using NpgsqlTypes;
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
