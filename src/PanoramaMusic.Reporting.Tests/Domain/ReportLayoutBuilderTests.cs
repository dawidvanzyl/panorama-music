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
}