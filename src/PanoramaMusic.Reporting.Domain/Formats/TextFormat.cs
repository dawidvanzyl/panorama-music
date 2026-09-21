using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>A single source read verbatim; null renders as an empty string.</summary>
public sealed class TextFormat(string source) : IColumnFormat
{
	public string Format(SourceValues sources) => sources.GetString(source) ?? string.Empty;
}
