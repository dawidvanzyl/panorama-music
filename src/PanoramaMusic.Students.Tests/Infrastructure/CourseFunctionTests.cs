using Npgsql;
using PanoramaMusic.Students.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Infrastructure;

/// <summary>
/// Resolving a course from its type and its lesson structure — the read an
/// enrolment off the waiting list depends on, since nothing there names a
/// course. A mocked repository returns whatever the test tells it to, so only a
/// real Postgres read can show that the predicate matches on both dimensions
/// and finds nothing when the school offers no such course.
/// </summary>
public class CourseFunctionTests : IClassFixture<StudentsDatabaseFixture>
{
	// Group · HalfHour · DuringSchool, from seed_lesson_structures.sql. Chosen
	// because no other function test builds a catalogue under it.
	private static readonly Guid _lessonStructureId = Guid.Parse("805c3cfd-7d2e-4376-b93b-4b4e2547f5e8");

	// Group · HalfHour · AfterSchool, from seed_lesson_structures.sql.
	private static readonly Guid _otherLessonStructureId = Guid.Parse("d786cc42-4176-437a-badb-8f0ae97bbdc9");

	private readonly StudentsDatabaseFixture _fixture;

	public CourseFunctionTests(StudentsDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "295UC1")]
	public async Task GetCourseByTypeAndStructure_TheInstrumentCourseForThatStructure_IsResolved()
	{
		var instrument = await GivenCourseAsync("Instrument", _lessonStructureId);
		// A course of another type under the same structure, and an instrument
		// course under another structure: neither may be what comes back.
		await GivenCourseAsync("Theory", _lessonStructureId);
		await GivenCourseAsync("Instrument", _otherLessonStructureId);

		var resolved = await ReadCourseIdAsync("Instrument", _lessonStructureId);

		resolved.ShouldBe(instrument);
	}

	[Fact]
	[Trait("AC", "295UC4")]
	public async Task GetCourseByTypeAndStructure_NoCourseOfThatTypeUnderTheStructure_ResolvesNothing()
	{
		await GivenCourseAsync("G2Recorder", _otherLessonStructureId);

		var resolved = await ReadCourseIdAsync("G1Enrichment", _otherLessonStructureId);

		resolved.ShouldBeNull();
	}

	private async Task<Guid> GivenCourseAsync(string courseType, Guid lessonStructureId)
	{
		var courseId = Guid.NewGuid();

		await using var command = _fixture.Connection.CreateCommand();
		command.CommandText =
			"SELECT students.create_course(@p_course_id, @p_course_type, @p_cost, @p_lesson_structure_id);";
		command.Parameters.Add(new NpgsqlParameter("p_course_id", courseId));
		command.Parameters.Add(new NpgsqlParameter("p_course_type", courseType));
		command.Parameters.Add(new NpgsqlParameter("p_cost", 450.00m));
		command.Parameters.Add(new NpgsqlParameter("p_lesson_structure_id", lessonStructureId));

		await command.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);

		return courseId;
	}

	private async Task<Guid?> ReadCourseIdAsync(string courseType, Guid lessonStructureId)
	{
		await using var command = _fixture.Connection.CreateCommand();
		command.CommandText =
			"SELECT course_id FROM students.get_course_by_type_and_structure(@p_course_type, @p_lesson_structure_id);";
		command.Parameters.Add(new NpgsqlParameter("p_course_type", courseType));
		command.Parameters.Add(new NpgsqlParameter("p_lesson_structure_id", lessonStructureId));

		var result = await command.ExecuteScalarAsync(TestContext.Current.CancellationToken);
		return result is Guid id ? id : null;
	}
}
