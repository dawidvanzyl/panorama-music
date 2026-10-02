using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>Renders a boolean source as <c>Yes</c> or <c>No</c>.</summary>
public sealed class YesNoFormat(string source) : IColumnFormat
{
	public string Format(SourceValues sources) => sources.GetBoolean(source) ? "Yes" : "No";
}