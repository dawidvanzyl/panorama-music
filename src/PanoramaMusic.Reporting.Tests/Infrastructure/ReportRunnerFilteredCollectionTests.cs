using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

/// <summary>Exercises the real, DI-resolved <c>ReportRunner</c> end to end against a live Postgres.</summary>
public class ReportRunnerFilteredCollectionTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;
	private readonly StudentFieldRegistry _registry = new();
	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	public ReportRunnerFilteredCollectionTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	[Fact]
	[Trait("AC", "329UC3")]
	public async Task RunAsync_GuardianFilteredAndCourseProjectedUnfiltered_ListsEveryCourse()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var theoryCourseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);
		var instrumentCourseId = await StudentSeeder.InsertCourseAsync(connection, "Instrument", StudentSeeder.InstrumentHourLessonStructureId);

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "Hal", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(connection, studentId, "G", token, StudentSeeder.FatherRelationshipId, married: true);
		var theorySc = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, theoryCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, theorySc, null, "Step2A");
		var instrumentSc = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, instrumentCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, instrumentSc, "Guitar", "Step2A");

		var definition = ReportDefinition.Create(
			[
				new ReportFilterInput("student.name", "contains", [token]),
				new ReportFilterInput("guardian.married", "equals", ["Yes"]),
			],
			["student.name", "course.courseType"],
			_registry,
			_noDatasourceOptions);

		var layout = await _fixture.RunReportAsync(definition, ct);

		var section = layout.Sections.ShouldHaveSingleItem();
		var courseTypeIndex = layout.Columns.ToList().FindIndex(column => column.Key == "course.courseType");

		ShouldlyHelpers.Satisfy(
			() => section.Rows.Count.ShouldBe(2),
			() => section.Rows.Select(row => row[courseTypeIndex]).ShouldContain("Theory"),
			() => section.Rows.Select(row => row[courseTypeIndex]).ShouldContain("Instrument"));
	}

	[Fact]
	[Trait("AC", "329UC5")]
	public async Task RunAsync_CourseTypeTheoryFilteredAndProjected_ListsOnlyTheTheoryCourse()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var theoryCourseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);
		var instrumentCourseId = await StudentSeeder.InsertCourseAsync(connection, "Instrument", StudentSeeder.InstrumentHourLessonStructureId);

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "Hal", token, new DateOnly(2015, 1, 1));
		var theorySc = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, theoryCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, theorySc, null, "Step2A");
		var instrumentSc = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, instrumentCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, instrumentSc, "Guitar", "Step2A");

		var definition = ReportDefinition.Create(
			[
				new ReportFilterInput("student.name", "contains", [token]),
				new ReportFilterInput("course.courseType", "equals", ["Theory"]),
			],
			["student.name", "course.courseType"],
			_registry,
			_noDatasourceOptions);

		var layout = await _fixture.RunReportAsync(definition, ct);

		var section = layout.Sections.ShouldHaveSingleItem();
		var courseTypeIndex = layout.Columns.ToList().FindIndex(column => column.Key == "course.courseType");

		ShouldlyHelpers.Satisfy(
			() => section.Rows.Count.ShouldBe(1),
			() => section.Rows[0][courseTypeIndex].ShouldBe("Theory"));
	}
}