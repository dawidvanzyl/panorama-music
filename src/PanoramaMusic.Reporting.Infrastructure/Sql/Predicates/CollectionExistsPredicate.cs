using PanoramaMusic.Reporting.Infrastructure.Sql;

namespace PanoramaMusic.Reporting.Infrastructure.Sql.Predicates;

/// <summary>
/// Builds the shared EXISTS shape every collection filter uses: a student is
/// included when one of their records in that collection matches every
/// filter on that collection, so filtering a collection never multiplies
/// population rows.
/// </summary>
internal static class CollectionExistsPredicate
{
	public static string Exists(CollectionScope scope, string condition) =>
		$"EXISTS (SELECT 1 {scope.From} WHERE {scope.StudentJoin} AND {condition})";
}