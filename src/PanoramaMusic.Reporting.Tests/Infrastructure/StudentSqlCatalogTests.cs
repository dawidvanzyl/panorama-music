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
	public void Sources_ResolveEveryColumnsDeclaredSource()
	{
		foreach (var column in _registry.Columns)
		{
			foreach (var source in column.Sources)
			{
				_catalog.Sources.ContainsKey(source).ShouldBeTrue($"Missing source '{source}' for column '{column.Key}'.");
			}
		}
	}
}