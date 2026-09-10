using Npgsql;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// Which of the seeded lesson structures the school actually runs an instrument
/// course under. The whole rule lives in one SQL predicate, and a mocked
/// repository returns whatever the test hands it, so only a real Postgres read
/// can show that a structure with no course is left out, that a structure
/// carrying nothing but non-instrument courses is left out too, and that the
/// unfiltered read the course catalogue depends on is unaffected.
/// </summary>
public class LessonStructureFunctionTests(StudentsDatabaseFixture fixture) : IClassFixture<StudentsDatabaseFixture>
{
	// Individual · Hour · DuringSchool, from seed_lesson_structures.sql.
	private static readonly Guid _structureWithInstrumentCourse = Guid.Parse("e9ac58cc-d6a5-406e-b6a2-55076a0a3565");

	// Individual · Hour · AfterSchool. No course of any kind is created against
	// it here, and nothing else in this class touches it.
	private static readonly Guid _structureWithNoCourses = Guid.Parse("42e1c54f-aa5d-4dd0-ab1a-aced05dd3c54");

	// Group · Hour · AfterSchool, given non-instrument courses only.
	private static readonly Guid _structureWithNonInstrumentCoursesOnly = Guid.Parse("40312a7e-af5e-4629-a94e-455b852956f0");

	private const int _seededStructureCount = 8;

	[Fact]
	[Trait("AC", "309UC1")]
	public async Task GetOfferedLessonStructures_AStructureCarryingAnInstrumentCourse_IsIncluded()
	{
		await GivenCourseAsync("Instrument", _structureWithInstrumentCourse);

		var offered = await ReadOfferedIdsAsync();

		offered.ShouldContain(_structureWithInstrumentCourse);
	}

	[Fact]
	[Trait("AC", "309UC2")]
	public async Task GetOfferedLessonStructures_AStructureWithNoCoursesAtAll_IsExcluded()
	{
		await GivenCourseAsync("Instrument", _structureWithInstrumentCourse);

		var offered = await ReadOfferedIdsAsync();

		// The instrument course above is the anchor: an empty result would
		// satisfy the exclusion below for entirely the wrong reason.
		ShouldlyHelpers.Satisfy(
			() => offered.ShouldContain(_structureWithInstrumentCourse),
			() => offered.ShouldNotContain(_structureWithNoCourses));
	}

	[Fact]
	[Trait("AC", "309UC3")]
	public async Task GetOfferedLessonStructures_AStructureCarryingOnlyNonInstrumentCourses_IsExcluded()
	{
		await GivenCourseAsync("Theory", _structureWithNonInstrumentCoursesOnly);
		await GivenCourseAsync("G2Recorder", _structureWithNonInstrumentCoursesOnly);
		await GivenCourseAsync("Instrument", _structureWithInstrumentCourse);

		var offered = await ReadOfferedIdsAsync();

		ShouldlyHelpers.Satisfy(
			() => offered.ShouldContain(_structureWithInstrumentCourse),
			() => offered.ShouldNotContain(_structureWithNonInstrumentCoursesOnly));
	}

	[Fact]
	[Trait("AC", "309UC4")]
	public async Task GetLessonStructures_InTheSameStateTheOfferedReadFilters_StillReturnsEverySeededStructure()
	{
		await GivenCourseAsync("Instrument", _structureWithInstrumentCourse);

		var all = await ReadAllIdsAsync();
		var offered = await ReadOfferedIdsAsync();

		// Creating a course is how a structure becomes offered, so the read the
		// course catalogue uses has to keep showing the combinations no course
		// exists for yet — otherwise a new one could never be reached.
		ShouldlyHelpers.Satisfy(
			() => all.Count.ShouldBe(_seededStructureCount),
			() => all.ShouldContain(_structureWithNoCourses),
			() => offered.Count.ShouldBeLessThan(all.Count));
	}

	private async Task GivenCourseAsync(string courseType, Guid lessonStructureId)
	{
		await using var command = fixture.Connection.CreateCommand();
		command.CommandText =
			"SELECT students.create_course(@p_course_id, @p_course_type, @p_cost, @p_lesson_structure_id);";
		command.Parameters.Add(new NpgsqlParameter("p_course_id", Guid.NewGuid()));
		command.Parameters.Add(new NpgsqlParameter("p_course_type", courseType));
		command.Parameters.Add(new NpgsqlParameter("p_cost", 450.00m));
		command.Parameters.Add(new NpgsqlParameter("p_lesson_structure_id", lessonStructureId));

		await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
	}

	private Task<List<Guid>> ReadOfferedIdsAsync() =>
		ReadIdsAsync("SELECT lesson_structure_id FROM students.get_offered_lesson_structures();");

	private Task<List<Guid>> ReadAllIdsAsync() =>
		ReadIdsAsync("SELECT lesson_structure_id FROM students.get_lesson_structures();");

	private async Task<List<Guid>> ReadIdsAsync(string sql)
	{
		await using var command = fixture.Connection.CreateCommand();
		command.CommandText = sql;

		await using var reader = await command.ExecuteReaderAsync(TestContext.Current.CancellationToken);
		var ids = new List<Guid>();
		while (await reader.ReadAsync(TestContext.Current.CancellationToken))
		{
			ids.Add(reader.GetGuid(0));
		}

		return ids;
	}
}