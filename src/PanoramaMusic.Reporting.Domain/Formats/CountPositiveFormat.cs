using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>
/// Has Sibling column (317UC9): <c>Yes</c> when the named count source is
/// greater than zero, else <c>No</c>. There is no separate boolean source for
/// "has siblings" — it is derived from the same sibling count the Number Of
/// Siblings column reads.
/// </summary>
public sealed class CountPositiveFormat(string source) : IColumnFormat
{
	public string Format(SourceValues sources) => sources.GetInt32(source) > 0 ? "Yes" : "No";
}
