using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Tests.Fixtures;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class CollectionFilterSqlTests : IClassFixture<ReportingDatabaseFixture>
{
	private readonly ReportingDatabaseFixture _fixture;
	private readonly StudentFieldRegistry _registry = new();

	public CollectionFilterSqlTests(ReportingDatabaseFixture fixture)
	{
		_fixture = fixture;
	}

	public static IEnumerable<object[]> NonStudentFilterKeys()
	{
		var registry = new StudentFieldRegistry();
		foreach (var filter in registry.Filters.Where(filter => filter.Collection != ReportCollection.Student))
		{
			foreach (var op in filter.Operators)
			{
				yield return [filter.Key, op];
			}
		}
	}

	[Theory]
	[MemberData(nameof(NonStudentFilterKeys))]
	[Trait("AC", "329UC2")]
	public async Task ReadAsync_EveryCollectionFilterKey_ExecutesInPopulationAndCollectionQuery(string field, FilterOperator op)
	{
		var ct = TestContext.Current.CancellationToken;
		var attribute = _registry.TryGetFilter(field)!;
		var operatorName = op switch
		{
			FilterOperator.Equals => "equals",
			FilterOperator.Contains => "contains",
			FilterOperator.In => "in",
			_ => throw new ArgumentOutOfRangeException(nameof(op)),
		};

		var datasourceOptions = new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();
		string value;
		if (attribute.DataType == FieldDataType.Datasource)
		{
			value = Guid.NewGuid().ToString();
			datasourceOptions[attribute.Datasource!.Value] = [new(value, "x")];
		}
		else
		{
			value = attribute.DataType is FieldDataType.List or FieldDataType.Boolean ? attribute.Options[0].Value : "x";
		}

		var definition = ReportDefinition.Create(
			[new ReportFilterInput(field, operatorName, [value])],
			["student.name"],
			_registry,
			datasourceOptions);

		var population = await _fixture.ReadPopulationAsync(definition, ct);
		var records = await _fixture.ReadCollectionAsync(attribute.Collection, [], ct, definition.FiltersFor(attribute.Collection));

		ShouldlyHelpers.Satisfy(
			() => population.ShouldNotBeNull(),
			() => records.ShouldNotBeNull());
	}
}