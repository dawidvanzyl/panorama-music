using System.Globalization;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>Renders an integer source with the <c>##0</c> pattern (no leading zeros or grouping).</summary>
public sealed class CountFormat(string source) : IColumnFormat
{
	public string Format(SourceValues sources) => sources.GetInt32(source).ToString("##0", CultureInfo.InvariantCulture);
}
