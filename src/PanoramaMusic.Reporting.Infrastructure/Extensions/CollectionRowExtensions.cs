using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Infrastructure.Extensions;

/// <summary>
/// Maps one dynamic collection-query row to a <see cref="CollectionRecord"/>.
/// The SQL column alias is mapped back to its logical source name in C#
/// here — no identifier from the request ever reaches this far.
/// </summary>
public static class CollectionRowExtensions
{
	public static CollectionRecord ToCollectionRecord(
		this IDictionary<string, object> row,
		IReadOnlyDictionary<string, string> aliasToSource)
	{
		var studentId = (Guid)row["student_id"];

		var values = new Dictionary<string, object?>(aliasToSource.Count);
		foreach (var (alias, source) in aliasToSource)
		{
			var value = row[alias];
			values[source] = value is DBNull ? null : value;
		}

		return new CollectionRecord(studentId, new SourceValues(values));
	}
}