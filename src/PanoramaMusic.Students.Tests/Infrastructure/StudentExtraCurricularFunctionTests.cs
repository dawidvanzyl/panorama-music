using Npgsql;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// What a student's extra-curricular assignments actually do in real Postgres.
/// Both behaviours asserted here live in the schema and the query rather than in
/// application code — which phase-matched, not-yet-assigned activities the picker
/// is offered, and that deleting a student takes their assignments with them — so
/// no handler test could prove either.
/// </summary>
public class StudentExtraCurricularFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	private readonly StudentsDatabaseFixture _fixture;

	public StudentExtraCurricularFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "277UC6")]
	public async Task GetAssignableExtraCurriculars_ReturnsOnlyTheStudentsOwnPhaseAndOnlyWhatTheyDoNotHold()
	{
		var studentId = await GivenStudentAsync("Junior");
		var held = await GivenActivityWithSlotAsync($"Choir {Guid.NewGuid()}", "Junior");
		var offered = await GivenActivityWithSlotAsync($"Marimba Band {Guid.NewGuid()}", "Junior");
		var otherPhase = await GivenActivityWithSlotAsync($"Senior Band {Guid.NewGuid()}", "Senior");
		await GivenAssignedAsync(studentId, held);

		var assignable = await ReadAssignableAsync(studentId);

		ShouldlyHelpers.Satisfy(
			() => assignable.ShouldContain(offered),
			// Already taken part in, so no longer offered — the anti-join, not a
			// filter the caller applies afterwards.
			() => assignable.ShouldNotContain(held),
			() => assignable.ShouldNotContain(otherPhase));
	}

	[Fact]
	[Trait("AC", "277UC6")]
	public async Task GetAssignableExtraCurriculars_StudentWithNoRecordedPhase_IsOfferedNothing()
	{
		var studentId = await GivenStudentAsync(phase: null);
		await GivenActivityWithSlotAsync($"Junior Drumline {Guid.NewGuid()}", "Junior");
		await GivenActivityWithSlotAsync($"Senior Drumline {Guid.NewGuid()}", "Senior");

		var assignable = await ReadAssignableAsync(studentId);

		// A phase equality against NULL is never true, so the student matches no
		// activity — no phase recorded means no activity to take part in, rather
		// than every activity in the catalogue.
		assignable.ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "277UC9")]
	public async Task DeleteStudent_StudentWithAssignments_RemovesThemLeavingTheActivitiesStanding()
	{
		var studentId = await GivenStudentAsync("Junior");
		var otherStudentId = await GivenStudentAsync("Junior");
		var choir = await GivenActivityWithSlotAsync($"Choir {Guid.NewGuid()}", "Junior");
		var band = await GivenActivityWithSlotAsync($"Marimba Band {Guid.NewGuid()}", "Junior");
		await GivenAssignedAsync(studentId, choir);
		await GivenAssignedAsync(studentId, band);
		// Another student on one of the same activities: a cascade that removed by
		// activity rather than by student would take this one out too.
		await GivenAssignedAsync(otherStudentId, choir);

		await CallAsync("DELETE FROM students.students WHERE student_id = @student_id;", ("student_id", studentId));

		var remainingForStudent = await CountAssignmentsAsync(studentId);
		var remainingForOther = await CountAssignmentsAsync(otherStudentId);
		var choirStands = await ActivityExistsAsync(choir);
		var bandStands = await ActivityExistsAsync(band);

		ShouldlyHelpers.Satisfy(
			() => remainingForStudent.ShouldBe(0),
			() => remainingForOther.ShouldBe(1),
			// Only the links went — both activities are still in the catalogue.
			() => choirStands.ShouldBeTrue(),
			() => bandStands.ShouldBeTrue());
	}

	private async Task<List<Guid>> ReadAssignableAsync(Guid studentId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = """
			SELECT DISTINCT extra_curricular_id
			FROM students.get_assignable_extra_curriculars(@p_student_id);
			""";
		select.Parameters.AddWithValue("p_student_id", studentId);

		await using var reader = await select.ExecuteReaderAsync(TestContext.Current.CancellationToken);

		var ids = new List<Guid>();
		while (await reader.ReadAsync(TestContext.Current.CancellationToken))
		{
			ids.Add(reader.GetGuid(0));
		}

		return ids;
	}

	private async Task<long> CountAssignmentsAsync(Guid studentId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = "SELECT COUNT(*) FROM students.student_extra_curriculars WHERE student_id = @student_id;";
		select.Parameters.AddWithValue("student_id", studentId);

		return (long)(await select.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
	}

	private async Task<bool> ActivityExistsAsync(Guid extraCurricularId)
	{
		await using var select = _fixture.Connection.CreateCommand();
		select.CommandText = "SELECT EXISTS (SELECT 1 FROM students.extra_curriculars WHERE extra_curricular_id = @id);";
		select.Parameters.AddWithValue("id", extraCurricularId);

		return (bool)(await select.ExecuteScalarAsync(TestContext.Current.CancellationToken))!;
	}

	private async Task<Guid> GivenStudentAsync(string? phase)
	{
		var studentId = Guid.NewGuid();

		await CallAsync(
			"""
			INSERT INTO students.students (student_id, first_name, last_name, date_of_birth, grade, class, phase, language)
			VALUES (@student_id, 'Thandi', 'Nkosi', DATE '2014-05-12', 'Grade4', 'A1', @phase, 'English');
			""",
			("student_id", studentId),
			("phase", phase));

		return studentId;
	}

	private async Task<Guid> GivenActivityWithSlotAsync(string description, string phase)
	{
		var activityId = Guid.NewGuid();

		await CallAsync(
			"SELECT students.create_extra_curricular(@p_extra_curricular_id, @p_description, @p_phase);",
			("p_extra_curricular_id", activityId),
			("p_description", description),
			("p_phase", phase));

		// The reads join through the practice times, so an activity without one
		// would never be offered — every activity in the catalogue has at least one.
		await CallAsync(
			"SELECT students.create_extra_curricular_practice_time(@p_practice_time_id, @p_extra_curricular_id, @p_day, @p_start_time);",
			("p_practice_time_id", Guid.NewGuid()),
			("p_extra_curricular_id", activityId),
			("p_day", "Monday"),
			("p_start_time", new TimeOnly(15, 0)));

		return activityId;
	}

	private Task GivenAssignedAsync(Guid studentId, Guid extraCurricularId) =>
		CallAsync(
			"SELECT students.create_student_extra_curricular(@p_student_id, @p_extra_curricular_id);",
			("p_student_id", studentId),
			("p_extra_curricular_id", extraCurricularId));

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
