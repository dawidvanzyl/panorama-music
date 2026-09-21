using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>
/// Joins several text sources with a separator, e.g. the Student column's
/// <c>{first_name} {last_name}</c>. A missing source contributes nothing
/// rather than a stray separator.
/// </summary>
public sealed class JoinFormat(string separator, params string[] sources) : IColumnFormat
{
	public string Format(SourceValues values) =>
		string.Join(separator, sources.Select(values.GetString).Where(value => !string.IsNullOrEmpty(value)));
}
