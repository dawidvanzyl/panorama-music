using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Domain;

public class StoredReportDefinitionTests
{
	private static readonly StudentFieldRegistry _registry = new();

	private static readonly IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> _noDatasourceOptions =
		new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();

	[Fact]
	public void From_ValidatedDefinition_KeepsFiltersInWireFormAndColumnsInDefinitionOrder()
	{
		var filters = new[] { new ReportFilterInput("student.grade", "equals", ["Grade4"]) };
		var columns = new[] { "student.name", "student.class" };
		var definition = ReportDefinition.Create(filters, columns, _registry, _noDatasourceOptions);

		var stored = StoredReportDefinition.From(definition);

		var filter = stored.Filters.ShouldHaveSingleItem();
		filter.Field.ShouldBe("student.grade");
		filter.Operator.ShouldBe("equals");
		filter.Values.ShouldBe(["Grade4"]);
		stored.Columns.ShouldBe(["student.name", "student.class"]);
	}
}
