using Dapper;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Sql.Predicates;

namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>
/// Turns a report's filters into SQL: one record condition per collection,
/// ANDing every filter on that collection over a single record, and the
/// population's predicates, which wrap each collection's condition in one
/// EXISTS. Every fragment comes from <see cref="StudentSqlCatalog"/> and the
/// collection scopes, and every value is bound.
/// </summary>
public sealed class ReportPredicateComposer(StudentSqlCatalog catalog)
{
	private static readonly ReportCollection[] _collectionOrder =
		[ReportCollection.Guardian, ReportCollection.Course, ReportCollection.ExtraCurricular];

	/// <summary>The AND of every filter on <paramref name="collection"/> over a single record, or null when there are none.</summary>
	public string? ComposeRecordCondition(ReportCollection collection, IReadOnlyList<ReportFilter> filters, DynamicParameters parameters)
	{
		if (collection == ReportCollection.Student)
			throw new InvalidOperationException("Student has no collection record condition.");

		if (filters.Count == 0)
			return null;

		var paramPrefix = ParamPrefix(collection);
		var conditions = new List<string>(filters.Count);
		for (var i = 0; i < filters.Count; i++)
		{
			var filter = filters[i];
			if (filter.Collection != collection)
				throw new InvalidOperationException($"Filter '{filter.Field}' does not belong to {collection}.");

			var builder = catalog.TryGetPredicateBuilder(filter.Field, filter.Operator)
				?? throw new InvalidOperationException(
					$"No predicate is registered for filter '{filter.Field}'/'{filter.Operator}'.");

			var fragment = builder($"{paramPrefix}{i}", parameters, filter.Values);
			conditions.Add($"({fragment.Sql})");
		}

		return $"({string.Join(" AND ", conditions)})";
	}

	/// <summary>
	/// The Student filters' own fragments, followed by one EXISTS per
	/// filtered collection in the order Guardian, Course, Extra-Curricular.
	/// </summary>
	public IReadOnlyList<PredicateFragment> ComposePopulationPredicates(IReadOnlyList<ReportFilter> filters, DynamicParameters parameters)
	{
		var predicates = new List<PredicateFragment>();

		for (var i = 0; i < filters.Count; i++)
		{
			var filter = filters[i];
			if (filter.Collection != ReportCollection.Student)
				continue;

			var builder = catalog.TryGetPredicateBuilder(filter.Field, filter.Operator)
				?? throw new InvalidOperationException(
					$"No predicate is registered for filter '{filter.Field}'/'{filter.Operator}'.");

			predicates.Add(builder($"f{i}", parameters, filter.Values));
		}

		foreach (var collection in _collectionOrder)
		{
			var collectionFilters = filters.Where(filter => filter.Collection == collection).ToList();
			if (collectionFilters.Count == 0)
				continue;

			var condition = ComposeRecordCondition(collection, collectionFilters, parameters)!;
			predicates.Add(new PredicateFragment(CollectionExistsPredicate.Exists(ScopeFor(collection), condition), false));
		}

		return predicates;
	}

	private static CollectionScope ScopeFor(ReportCollection collection) => collection switch
	{
		ReportCollection.Guardian => GuardianPredicates.Scope,
		ReportCollection.Course => CoursePredicates.Scope,
		ReportCollection.ExtraCurricular => ExtraCurricularPredicates.Scope,
		_ => throw new InvalidOperationException($"{collection} has no collection scope."),
	};

	private static string ParamPrefix(ReportCollection collection) => collection switch
	{
		ReportCollection.Guardian => "guardian",
		ReportCollection.Course => "course",
		ReportCollection.ExtraCurricular => "extraCurricular",
		_ => throw new InvalidOperationException($"{collection} has no filter parameter prefix."),
	};
}
