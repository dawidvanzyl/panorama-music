using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>Maps a stored value to its registered option label; an unknown value renders verbatim.</summary>
public sealed class OptionLabelFormat(string source, IReadOnlyList<FieldOption> options) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		var value = sources.GetString(source);
		if (value is null)
			return string.Empty;

		var option = options.FirstOrDefault(candidate => candidate.Value == value);
		return option?.Label ?? value;
	}
}
