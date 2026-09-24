using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.Services;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class ReportLayoutBuilderTests
{
	private readonly StudentFieldRegistry _registry = new();
	private readonly ReportLayoutBuilder _builder = new();
	private static readonly IReadOnlyDictionary<ReportCollection, IReadOnlyList<CollectionRecord>> _noCollections =
		new Dictionary<ReportCollection, IReadOnlyList<CollectionRecord>>();
	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	[Fact]
	[Trait("AC", "317UC7")]
	public void Build_ClassColumnEndToEnd_Grade4A2FormatsAs4A2AndPrivateFormatsAsPrivate()
	{
		var definition = ReportDefinition.Create([], ["student.name", "student.class"], _registry, _noDatasourceOptions);

		var member = new PopulationMember(
			Guid.NewGuid(),
			new SourceValues(new Dictionary<string, object?>
			{
				["firstName"] = "Amy",
				["lastName"] = "van Zyl",
				["grade"] = "Grade4",
				["class"] = "A2",
			}));
		var privateMember = new PopulationMember(
			Guid.NewGuid(),
			new SourceValues(new Dictionary<string, object?>
			{
				["firstName"] = "Sam",
				["lastName"] = "Private",
				["grade"] = "Private",
				["class"] = null,
			}));

		var layout = _builder.Build(definition, [member, privateMember], _noCollections);

		ShouldlyHelpers.Satisfy(
			() => layout.Sections[0].Rows[0][1].ShouldBe("4A2"),
			() => layout.Sections[1].Rows[0][1].ShouldBe("Private"));
	}

	[Fact]
	public void Build_PopulationOrder_IsPreservedInSections()
	{
		var definition = ReportDefinition.Create([], ["student.name"], _registry, _noDatasourceOptions);
		var first = new PopulationMember(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["firstName"] = "A", ["lastName"] = "A" }));
		var second = new PopulationMember(Guid.NewGuid(), new SourceValues(new Dictionary<string, object?> { ["firstName"] = "B", ["lastName"] = "B" }));

		var layout = _builder.Build(definition, [first, second], _noCollections);

		layout.Sections.Select(s => s.StudentId).ShouldBe([first.StudentId, second.StudentId]);
	}

	private static CollectionRecord Guardian(Guid studentId, string name) =>
		new(studentId, new SourceValues(new Dictionary<string, object?> { ["firstName"] = name, ["surname"] = "G", ["relationship"] = "Father" }));

	private static CollectionRecord Course(Guid studentId, string courseType) =>
		new(studentId, new SourceValues(new Dictionary<string, object?> { ["courseType"] = courseType }));

	[Fact]
	[Trait("AC", "318UC2")]
	public void Build_TwoGuardiansThreeCourses_ThreeRowsWithGuardianBlankOnRowThree()
	{
		var definition = ReportDefinition.Create([], ["student.name", "guardian.name", "course.courseType"], _registry, _noDatasourceOptions);
		var studentId = Guid.NewGuid();
		var member = new PopulationMember(studentId, new SourceValues(new Dictionary<string, object?> { ["firstName"] = "Gus", ["lastName"] = "Z" }));

		var collections = new Dictionary<ReportCollection, IReadOnlyList<CollectionRecord>>
		{
			[ReportCollection.Guardian] = [Guardian(studentId, "G1"), Guardian(studentId, "G2")],
			[ReportCollection.Course] = [Course(studentId, "Theory"), Course(studentId, "G2Recorder"), Course(studentId, "Instrument")],
		};

		var layout = _builder.Build(definition, [member], collections);

		var rows = layout.Sections.Single().Rows;
		ShouldlyHelpers.Satisfy(
			() => rows.Count.ShouldBe(3),
			() => rows[2][1].ShouldBe(string.Empty));
	}

	[Fact]
	[Trait("AC", "318UC5")]
	public void Build_ThreeRowSection_StudentAndClassCellsOnRowOneOnlyCourseTypeRepeatsEveryRow()
	{
		var definition = ReportDefinition.Create([], ["student.name", "student.class", "course.courseType"], _registry, _noDatasourceOptions);
		var studentId = Guid.NewGuid();
		var member = new PopulationMember(studentId, new SourceValues(new Dictionary<string, object?>
		{
			["firstName"] = "Amy",
			["lastName"] = "Z",
			["grade"] = "Grade4",
			["class"] = "A1",
		}));

		var collections = new Dictionary<ReportCollection, IReadOnlyList<CollectionRecord>>
		{
			[ReportCollection.Course] = [Course(studentId, "Instrument"), Course(studentId, "Instrument"), Course(studentId, "Instrument")],
		};

		var layout = _builder.Build(definition, [member], collections);

		var rows = layout.Sections.Single().Rows;
		ShouldlyHelpers.Satisfy(
			() => rows.Count.ShouldBe(3),
			() => rows[0][0].ShouldBe("Amy Z"),
			() => rows[0][1].ShouldBe("4A1"),
			() => rows[1][0].ShouldBe(string.Empty),
			() => rows[1][1].ShouldBe(string.Empty),
			() => rows[0][2].ShouldBe("Instrument"),
			() => rows[1][2].ShouldBe("Instrument"),
			() => rows[2][2].ShouldBe("Instrument"));
	}

	[Fact]
	[Trait("AC", "318UC6")]
	public void Build_NoGuardiansTwoCourses_TwoRowsWithBlankGuardianCells()
	{
		var definition = ReportDefinition.Create([], ["student.name", "guardian.name", "course.courseType"], _registry, _noDatasourceOptions);
		var studentId = Guid.NewGuid();
		var member = new PopulationMember(studentId, new SourceValues(new Dictionary<string, object?> { ["firstName"] = "Bo", ["lastName"] = "Z" }));

		var collections = new Dictionary<ReportCollection, IReadOnlyList<CollectionRecord>>
		{
			[ReportCollection.Guardian] = [],
			[ReportCollection.Course] = [Course(studentId, "Theory"), Course(studentId, "G2Recorder")],
		};

		var layout = _builder.Build(definition, [member], collections);

		var rows = layout.Sections.Single().Rows;
		ShouldlyHelpers.Satisfy(
			() => rows.Count.ShouldBe(2),
			() => rows[0][1].ShouldBe(string.Empty),
			() => rows[1][1].ShouldBe(string.Empty));
	}
}