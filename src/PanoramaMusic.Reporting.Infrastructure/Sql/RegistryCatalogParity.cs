using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Registries;

namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>
/// The Domain registry and this Infrastructure catalog are one allowlist
/// split across two layers, and this check is what keeps them from drifting
/// apart. Run at startup (<c>AddReportingInfrastructure</c>) and in a test.
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

		var missingStudentSources = registry.Columns
			.Where(column => column.Collection == ReportCollection.Student)
			.SelectMany(column => column.Sources)
			.Distinct()
			.Where(source => !catalog.Sources.ContainsKey(source))
			.ToList();

		var missingCollectionSources = registry.Columns
			.Where(column => column.Collection != ReportCollection.Student)
			.GroupBy(column => column.Collection)
			.SelectMany(group => MissingSources(group.Key, group.SelectMany(column => column.Sources).Distinct()))
			.ToList();

		var missingOrderSources = Enum.GetValues<ReportCollection>()
			.Where(collection => collection != ReportCollection.Student)
			.SelectMany(collection => MissingSources(collection, StudentFieldRegistry.OrderSources(collection)))
			.ToList();

		if (missingPredicates.Count == 0 && extraPredicates.Count == 0
			&& missingStudentSources.Count == 0 && missingCollectionSources.Count == 0 && missingOrderSources.Count == 0)
		{
			return;
		}

		throw new InvalidOperationException(
			"Reporting registry/catalog parity failure. " +
			$"Missing predicates: [{Describe(missingPredicates)}]. " +
			$"Catalog predicates the registry does not declare: [{Describe(extraPredicates)}]. " +
			$"Student column sources the catalog does not resolve: [{string.Join(", ", missingStudentSources)}]. " +
			$"Collection column sources not resolved by their collection SQL: [{string.Join(", ", missingCollectionSources)}]. " +
			$"Collection order sources not resolved by their collection SQL: [{string.Join(", ", missingOrderSources)}].");
	}

	private static IEnumerable<string> MissingSources(ReportCollection collection, IEnumerable<string> sources)
	{
		var collectionSources = CollectionSources(collection);
		return sources.Where(source => !collectionSources.Values.Contains(source));
	}

	private static IReadOnlyDictionary<string, string> CollectionSources(ReportCollection collection) => collection switch
	{
		ReportCollection.Guardian => GuardianCollectionSql.Sources,
		ReportCollection.Course => CourseCollectionSql.Sources,
		ReportCollection.ExtraCurricular => ExtraCurricularCollectionSql.Sources,
		_ => new Dictionary<string, string>(),
	};

	private static string Describe(IReadOnlyList<(string Field, FilterOperator Operator)> pairs) =>
		string.Join(", ", pairs.Select(pair => $"{pair.Field}/{pair.Operator}"));
}
