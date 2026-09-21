using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>Phase column (317UC8): blank when the grade is Private.</summary>
public sealed class PhaseFormat(string gradeSource, string phaseSource) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		var grade = sources.GetString(gradeSource);
		return grade == "Private" ? string.Empty : sources.GetString(phaseSource) ?? string.Empty;
	}
}
