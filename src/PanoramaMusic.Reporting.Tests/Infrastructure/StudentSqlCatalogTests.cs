using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Infrastructure.Sql;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Reporting.Tests.Infrastructure;

public class StudentSqlCatalogTests
{
	private readonly StudentFieldRegistry _registry = new();
	private readonly StudentSqlCatalog _catalog = new();

	[Fact]
	[Trait("AC", "317UC3")]
	public void Validate_RegistryAndCatalog_AreInParity()
	{
		Should.NotThrow(() => RegistryCatalogParity.Validate(_registry, _catalog));
	}

	[Fact]
	[Trait("AC", "317UC3")]
	public void PredicateKeys_CoverEveryRegisteredFilterOperatorPair()
	{
		foreach (var filter in _registry.Filters)
		{
			foreach (var op in filter.Operators)
			{
				_catalog.TryGetPredicateBuilder(filter.Key, op).ShouldNotBeNull();
			}
		}
	}

	[Fact]
	[Trait("AC", "317UC3")]
	public void Sources_ResolveEveryStudentColumnsDeclaredSource()
	{
		foreach (var column in _registry.Columns.Where(column => column.Collection == ReportCollection.Student))
		{
			foreach (var source in column.Sources)
			{
				_catalog.Sources.ContainsKey(source).ShouldBeTrue($"Missing source '{source}' for column '{column.Key}'.");
			}
		}
	}

	[Theory]
	[Trait("AC", "318UC15")]
	[InlineData(ReportCollection.Guardian)]
	[InlineData(ReportCollection.Course)]
	[InlineData(ReportCollection.ExtraCurricular)]
	public void CollectionSql_ResolvesEveryDeclaredColumnSourceAndOrderSource(ReportCollection collection)
	{
		var collectionSources = CollectionSourcesFor(collection);
		var columnSources = _registry.Columns
			.Where(column => column.Collection == collection)
			.SelectMany(column => column.Sources)
			.Distinct();

		foreach (var source in columnSources.Concat(StudentFieldRegistry.OrderSources(collection)))
		{
			collectionSources.Values.ShouldContain(source, $"Missing source '{source}' for collection '{collection}'.");
		}
	}

	private static IReadOnlyDictionary<string, string> CollectionSourcesFor(ReportCollection collection) => collection switch
	{
		ReportCollection.Guardian => GuardianCollectionSql.Sources,
		ReportCollection.Course => CourseCollectionSql.Sources,
		ReportCollection.ExtraCurricular => ExtraCurricularCollectionSql.Sources,
		_ => throw new ArgumentOutOfRangeException(nameof(collection)),
	};
}