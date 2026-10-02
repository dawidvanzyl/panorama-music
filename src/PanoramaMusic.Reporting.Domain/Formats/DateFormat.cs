using PanoramaMusic.Reporting.Domain.ValueObjects;
using System.Globalization;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>Date Of Birth column (317UC10): fixed <c>yyyy-MM-dd</c>, invariant culture.</summary>
public sealed class DateFormat(string source) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		var date = sources.GetDate(source);
		return date is null ? string.Empty : date.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
	}
}