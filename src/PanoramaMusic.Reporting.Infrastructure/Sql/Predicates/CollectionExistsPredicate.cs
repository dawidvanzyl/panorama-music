namespace PanoramaMusic.Reporting.Infrastructure.Sql.Predicates;

/// <summary>
/// Builds the shared EXISTS shape every collection filter predicate uses: a
/// student is included when any one of their records in that collection
/// matches, so a filter over a collection never multiplies population rows.
/// </summary>
internal static class CollectionExistsPredicate
{
	public static PredicateFragment Exists(string fromJoin, string joinCondition, string valueCondition) =>
		new($"EXISTS (SELECT 1 {fromJoin} WHERE {joinCondition} AND {valueCondition})", false);
}
