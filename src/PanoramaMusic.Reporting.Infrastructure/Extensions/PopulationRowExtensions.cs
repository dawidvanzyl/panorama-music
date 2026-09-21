using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Infrastructure.Extensions;

/// <summary>
/// Maps one dynamic population-query row to a <see cref="PopulationMember"/>.
/// Column aliases are positional (<c>c0</c>, <c>c1</c>…) and mapped back to
/// their logical source name in C# here — no identifier from the request ever
/// reaches this far.
/// </summary>
public static class PopulationRowExtensions
{
	public static PopulationMember ToPopulationMember(
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

		return new PopulationMember(studentId, new SourceValues(values));
	}
}
