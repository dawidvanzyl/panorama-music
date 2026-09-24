using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;

namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>
/// The Domain registry and this Infrastructure catalog are one allowlist
/// split across two layers, and this check is what keeps them from drifting
/// apart. Run at startup (<c>AddReportingInfrastructure</c>) and in a test
/// (317UC3).
/// </summary>
public static class RegistryCatalogParity
{
	public static void Validate(StudentFieldRegistry registry, StudentSqlCatalog catalog)
	{
		var registryPairs = registry.Filters
			.SelectMany(filter => filter.Operators.Select(op => (Field: filter.Key, Operator: op)))
			.ToHashSet();

		var missingPredicates = registryPairs
			.Where(pair => catalog.TryGetPredicateBuilder(pair.Field, pair.Operator) is null)
			.ToList();

		var extraPredicates = catalog.PredicateKeys
			.Where(pair => !registryPairs.Contains(pair))
			.ToList();

		var missingSources = registry.Columns
			.SelectMany(column => column.Sources)
			.Distinct()
			.Where(source => !catalog.Sources.ContainsKey(source))
			.ToList();

		if (missingPredicates.Count == 0 && extraPredicates.Count == 0 && missingSources.Count == 0)
			return;

		throw new InvalidOperationException(
			"Reporting registry/catalog parity failure. " +
			$"Missing predicates: [{Describe(missingPredicates)}]. " +
			$"Catalog predicates the registry does not declare: [{Describe(extraPredicates)}]. " +
			$"Column sources the catalog does not resolve: [{string.Join(", ", missingSources)}].");
	}

	private static string Describe(IReadOnlyList<(string Field, FilterOperator Operator)> pairs) =>
		string.Join(", ", pairs.Select(pair => $"{pair.Field}/{pair.Operator}"));
}