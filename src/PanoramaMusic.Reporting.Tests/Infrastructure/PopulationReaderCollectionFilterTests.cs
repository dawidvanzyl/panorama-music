using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

/// <summary>
/// Exercises <c>PopulationReader</c>'s new Guardian/Course/Extra-Curricular
/// `EXISTS` predicates through the real DI graph against a live Postgres.
/// Each test scopes its assertions to the students it itself seeded, the
/// same convention <c>PopulationReaderTests</c> uses.
/// </summary>
public class PopulationReaderCollectionFilterTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;
	private readonly StudentFieldRegistry _registry = new();
	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	public PopulationReaderCollectionFilterTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	private static ReportDefinition Definition(StudentFieldRegistry registry, ReportFilterInput filter) =>
		ReportDefinition.Create([filter], ["student.name"], registry, _noDatasourceOptions);

	private static ReportDefinition DatasourceDefinition(
		StudentFieldRegistry registry, string field, string op, string value, ReportDatasource datasource) =>
		ReportDefinition.Create(
			[new ReportFilterInput(field, op, [value])],
			["student.name"],
			registry,
			new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>> { [datasource] = [new(value, value)] });

	// --- 318UC1: Guardian · Married = Yes includes a student with any married guardian exactly once ---

	[Fact]
	[Trait("AC", "318UC1")]
	public async Task ReadAsync_GuardianMarriedYes_IncludesStudentOnceAndExcludesAllUnmarried()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var eveId = await StudentSeeder.InsertStudentAsync(connection, "Eve", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(connection, eveId, "G1", token, StudentSeeder.FatherRelationshipId, married: true);
		await StudentSeeder.InsertGuardianAsync(connection, eveId, "G2", token, StudentSeeder.FatherRelationshipId, married: false);

		var fayId = await StudentSeeder.InsertStudentAsync(connection, "Fay", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(connection, fayId, "G3", token, StudentSeeder.FatherRelationshipId, married: false);

		var definition = ReportDefinition.Create(
			[
				new ReportFilterInput("student.name", "contains", [token]),
				new ReportFilterInput("guardian.married", "equals", ["Yes"]),
			],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		ShouldlyHelpers.Satisfy(
			() => population.Count(m => m.StudentId == eveId).ShouldBe(1),
			() => population.ShouldNotContain(m => m.StudentId == fayId));
	}

	// --- 318UC3: a student with Instrument + Theory courses is included by a Course Type = Theory filter ---

	[Fact]
	[Trait("AC", "318UC3")]
	public async Task ReadAsync_CourseTypeTheory_IncludesStudentWithATheoryAndAnInstrumentCourse()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var theoryCourseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);
		var instrumentCourseId = await StudentSeeder.InsertCourseAsync(connection, "Instrument", StudentSeeder.InstrumentHourLessonStructureId);

		var halId = await StudentSeeder.InsertStudentAsync(connection, "Hal", token, new DateOnly(2015, 1, 1));
		var theoryStudentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, halId, theoryCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, theoryStudentCourseId, null, "Step2A");
		var instrumentStudentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, halId, instrumentCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, instrumentStudentCourseId, "Guitar", "Step2A");

		var definition = ReportDefinition.Create(
			[
				new ReportFilterInput("student.name", "contains", [token]),
				new ReportFilterInput("course.courseType", "equals", ["Theory"]),
			],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		population.ShouldContain(m => m.StudentId == halId);
	}

	// --- 318UC4: an Extra-Curricular · Activity filter includes only holders, once each ---

	[Fact]
	[Trait("AC", "318UC4")]
	public async Task ReadAsync_ActivityFilter_IncludesOnlyHoldersOfThatActivityOnceEach()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activityXId = await StudentSeeder.InsertExtraCurricularAsync(connection, $"Band {token}", "Junior");
		var activityYId = await StudentSeeder.InsertExtraCurricularAsync(connection, $"Art {token}", "Junior");

		var joId = await StudentSeeder.InsertStudentAsync(connection, "Jo", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.AssignExtraCurricularAsync(connection, joId, activityXId);
		await StudentSeeder.AssignExtraCurricularAsync(connection, joId, activityYId);

		var maxId = await StudentSeeder.InsertStudentAsync(connection, "Max", token, new DateOnly(2015, 1, 1));

		var scopedDefinition = ReportDefinition.Create(
			[
				new ReportFilterInput("student.name", "contains", [token]),
				new ReportFilterInput("extraCurricular.activity", "equals", [activityXId.ToString()]),
			],
			["student.name"],
			_registry,
			new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>
			{
				[ReportDatasource.ExtraCurricular] = [new(activityXId.ToString(), "Band")],
			});

		var population = await _fixture.ReadPopulationAsync(scopedDefinition, ct);

		ShouldlyHelpers.Satisfy(
			() => population.Count(m => m.StudentId == joId).ShouldBe(1),
			() => population.ShouldNotContain(m => m.StudentId == maxId));
	}

	// --- Supporting per-pair tests ---

	[Theory]
	[Trait("Supporting", "GuardianName")]
	[InlineData("equals")]
	[InlineData("contains")]
	public async Task ReadAsync_GuardianName_MatchesLiterallyAndExcludesOthers(string op)
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var matchId = await StudentSeeder.InsertStudentAsync(connection, "M", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(connection, matchId, "Percy", $"Zyl{token}", StudentSeeder.FatherRelationshipId);

		var otherId = await StudentSeeder.InsertStudentAsync(connection, "O", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(connection, otherId, "Nomatch", $"Nomatch{token}", StudentSeeder.FatherRelationshipId);

		var value = op == "equals" ? $"Percy Zyl{token}" : $"Zyl{token}";
		var definition = Definition(_registry, new ReportFilterInput("guardian.name", op, [value]));

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		ShouldlyHelpers.Satisfy(
			() => population.ShouldContain(m => m.StudentId == matchId),
			() => population.ShouldNotContain(m => m.StudentId == otherId));
	}

	[Fact]
	[Trait("Supporting", "GuardianRelationship")]
	public async Task ReadAsync_GuardianRelationship_EqualsAndInMatchByGuid()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var fatherId = await StudentSeeder.InsertStudentAsync(connection, "F", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(connection, fatherId, "G", token, StudentSeeder.FatherRelationshipId);

		var equalsDefinition = DatasourceDefinition(
			_registry, "guardian.relationship", "equals", StudentSeeder.FatherRelationshipId.ToString(), ReportDatasource.GuardianRelationship);
		var inDefinition = ReportDefinition.Create(
			[new ReportFilterInput("guardian.relationship", "in", [StudentSeeder.FatherRelationshipId.ToString()])],
			["student.name"],
			_registry,
			new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>
			{
				[ReportDatasource.GuardianRelationship] = [new(StudentSeeder.FatherRelationshipId.ToString(), "Father")],
			});

		var equalsPopulation = await _fixture.ReadPopulationAsync(equalsDefinition, ct);
		var inPopulation = await _fixture.ReadPopulationAsync(inDefinition, ct);

		ShouldlyHelpers.Satisfy(
			() => equalsPopulation.ShouldContain(m => m.StudentId == fatherId),
			() => inPopulation.ShouldContain(m => m.StudentId == fatherId));
	}

	[Theory]
	[Trait("Supporting", "GuardianFlags")]
	[InlineData("guardian.receivesCorrespondence")]
	[InlineData("guardian.responsibleForPayment")]
	public async Task ReadAsync_GuardianBooleanFlags_YesAndNoFilterCorrectly(string field)
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var yesId = await StudentSeeder.InsertStudentAsync(connection, "Y", token, new DateOnly(2015, 1, 1));
		var noId = await StudentSeeder.InsertStudentAsync(connection, "N", token, new DateOnly(2015, 1, 1));

		if (field == "guardian.receivesCorrespondence")
		{
			await StudentSeeder.InsertGuardianAsync(connection, yesId, "G", token, StudentSeeder.FatherRelationshipId, receivesCorrespondence: true);
			await StudentSeeder.InsertGuardianAsync(connection, noId, "G", token, StudentSeeder.FatherRelationshipId, receivesCorrespondence: false);
		}
		else
		{
			await StudentSeeder.InsertGuardianAsync(connection, yesId, "G", token, StudentSeeder.FatherRelationshipId, responsibleForPayment: true);
			await StudentSeeder.InsertGuardianAsync(connection, noId, "G", token, StudentSeeder.FatherRelationshipId, responsibleForPayment: false);
		}

		var yesDefinition = Definition(_registry, new ReportFilterInput(field, "equals", ["Yes"]));
		var noDefinition = Definition(_registry, new ReportFilterInput(field, "equals", ["No"]));

		var yesPopulation = await _fixture.ReadPopulationAsync(yesDefinition, ct);
		var noPopulation = await _fixture.ReadPopulationAsync(noDefinition, ct);

		ShouldlyHelpers.Satisfy(
			() => yesPopulation.ShouldContain(m => m.StudentId == yesId),
			() => yesPopulation.ShouldNotContain(m => m.StudentId == noId),
			() => noPopulation.ShouldContain(m => m.StudentId == noId),
			() => noPopulation.ShouldNotContain(m => m.StudentId == yesId));
	}

	[Fact]
	[Trait("Supporting", "CourseType")]
	public async Task ReadAsync_CourseTypeIn_MatchesAnyListedType()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var theoryCourseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		var studentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, theoryCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, studentCourseId, null, "Step1A");

		var definition = ReportDefinition.Create(
			[new ReportFilterInput("course.courseType", "in", ["Theory", "G2Recorder"])],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		population.ShouldContain(m => m.StudentId == studentId);
	}

	[Theory]
	[Trait("Supporting", "LessonStructure")]
	[InlineData("course.lessonType", "Individual")]
	[InlineData("course.durationType", "Hour")]
	[InlineData("course.occurrenceType", "DuringSchool")]
	public async Task ReadAsync_LessonStructureFilters_EqualsMatchesTheirStructure(string field, string value)
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var courseId = await StudentSeeder.InsertCourseAsync(connection, "Instrument", StudentSeeder.InstrumentHourLessonStructureId);

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		var studentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, courseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, studentCourseId, "Piano", "Step1A");

		var definition = Definition(_registry, new ReportFilterInput(field, "equals", [value]));

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		population.ShouldContain(m => m.StudentId == studentId);
	}

	[Fact]
	[Trait("Supporting", "InstrumentTypeGuard")]
	public async Task ReadAsync_InstrumentTypeFilter_IgnoresAStaleValueOnANonInstrumentCourse()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var instrumentCourseId = await StudentSeeder.InsertCourseAsync(connection, "Instrument", StudentSeeder.InstrumentHourLessonStructureId);
		var theoryCourseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);

		var matchId = await StudentSeeder.InsertStudentAsync(connection, "M", token, new DateOnly(2015, 1, 1));
		var matchStudentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, matchId, instrumentCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, matchStudentCourseId, "Piano", "Step1A");

		// A Theory course carries a stray instrument_type value; the guard
		// requires the course itself to be Instrument, so this must not match.
		var staleId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		var staleStudentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, staleId, theoryCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, staleStudentCourseId, "Piano", "Step1A");

		var definition = Definition(_registry, new ReportFilterInput("course.instrumentType", "equals", ["Piano"]));

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		ShouldlyHelpers.Satisfy(
			() => population.ShouldContain(m => m.StudentId == matchId),
			() => population.ShouldNotContain(m => m.StudentId == staleId));
	}

	[Fact]
	[Trait("Supporting", "StepTypeGuard")]
	public async Task ReadAsync_StepTypeFilter_IgnoresAStaleValueOnAnUnrelatedCourseType()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var theoryCourseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);
		var enrichmentCourseId = await StudentSeeder.InsertCourseAsync(connection, "GREEnrichment", StudentSeeder.LessonStructureId);

		var matchId = await StudentSeeder.InsertStudentAsync(connection, "M", token, new DateOnly(2015, 1, 1));
		var matchStudentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, matchId, theoryCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, matchStudentCourseId, null, "Step2A");

		var staleId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		var staleStudentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, staleId, enrichmentCourseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, staleStudentCourseId, null, "Step2A");

		var definition = Definition(_registry, new ReportFilterInput("course.stepType", "equals", ["Step2A"]));

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		ShouldlyHelpers.Satisfy(
			() => population.ShouldContain(m => m.StudentId == matchId),
			() => population.ShouldNotContain(m => m.StudentId == staleId));
	}

	[Fact]
	[Trait("Supporting", "CourseTeacher")]
	public async Task ReadAsync_CourseTeacher_EqualsAndInMatchByGuid()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var teacherId = await StudentSeeder.InsertTeacherAsync(connection, "T", token);
		var courseId = await StudentSeeder.InsertCourseAsync(connection, "Theory", StudentSeeder.TheoryLessonStructureId);

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		var studentCourseId = await StudentSeeder.InsertStudentCourseAsync(connection, studentId, courseId, teacherId);
		await StudentSeeder.InsertStudentInstrumentAsync(connection, studentCourseId, null, "Step1A");

		var equalsDefinition = DatasourceDefinition(_registry, "course.teacher", "equals", teacherId.ToString(), ReportDatasource.Teacher);
		var inDefinition = ReportDefinition.Create(
			[new ReportFilterInput("course.teacher", "in", [teacherId.ToString()])],
			["student.name"],
			_registry,
			new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>> { [ReportDatasource.Teacher] = [new(teacherId.ToString(), "T")] });

		var equalsPopulation = await _fixture.ReadPopulationAsync(equalsDefinition, ct);
		var inPopulation = await _fixture.ReadPopulationAsync(inDefinition, ct);

		ShouldlyHelpers.Satisfy(
			() => equalsPopulation.ShouldContain(m => m.StudentId == studentId),
			() => inPopulation.ShouldContain(m => m.StudentId == studentId));
	}

	[Fact]
	[Trait("Supporting", "ExtraCurricularActivityIn")]
	public async Task ReadAsync_ActivityIn_MatchesAnyListedActivity()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activityId = await StudentSeeder.InsertExtraCurricularAsync(connection, $"Choir {token}", "Junior");
		var studentId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.AssignExtraCurricularAsync(connection, studentId, activityId);

		var definition = ReportDefinition.Create(
			[new ReportFilterInput("extraCurricular.activity", "in", [activityId.ToString()])],
			["student.name"],
			_registry,
			new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>> { [ReportDatasource.ExtraCurricular] = [new(activityId.ToString(), "Choir")] });

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		population.ShouldContain(m => m.StudentId == studentId);
	}

	[Theory]
	[Trait("Supporting", "ExtraCurricularPhase")]
	[InlineData("equals")]
	[InlineData("in")]
	public async Task ReadAsync_ExtraCurricularPhase_MatchesTheActivitysPhase(string op)
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var activityId = await StudentSeeder.InsertExtraCurricularAsync(connection, $"Drama {token}", "Senior");
		var studentId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.AssignExtraCurricularAsync(connection, studentId, activityId);

		var definition = Definition(_registry, new ReportFilterInput("extraCurricular.phase", op, ["Senior"]));

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		population.ShouldContain(m => m.StudentId == studentId);
	}

	[Fact]
	[Trait("Supporting", "TwoFiltersSameCollectionDifferentRecords")]
	public async Task ReadAsync_TwoGuardianFilters_CanBeSatisfiedByDifferentRecords()
	{
		var ct = TestContext.Current.CancellationToken;
		await using var connection = _fixture.OpenConnection();
		var token = Guid.NewGuid().ToString("N")[..8];

		var studentId = await StudentSeeder.InsertStudentAsync(connection, "S", token, new DateOnly(2015, 1, 1));
		await StudentSeeder.InsertGuardianAsync(connection, studentId, "Married", token, StudentSeeder.FatherRelationshipId, married: true, receivesCorrespondence: false);
		await StudentSeeder.InsertGuardianAsync(connection, studentId, "Correspondent", token, StudentSeeder.FatherRelationshipId, married: false, receivesCorrespondence: true);

		var definition = ReportDefinition.Create(
			[
				new ReportFilterInput("student.name", "contains", [token]),
				new ReportFilterInput("guardian.married", "equals", ["Yes"]),
				new ReportFilterInput("guardian.receivesCorrespondence", "equals", ["Yes"]),
			],
			["student.name"],
			_registry,
			_noDatasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);

		population.ShouldContain(m => m.StudentId == studentId);
	}
}