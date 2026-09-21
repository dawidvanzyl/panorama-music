using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>
/// Class column (317UC7): <c>Private</c> when the grade is Private, otherwise
/// the grade's digit followed by the class, e.g. <c>Grade4</c> + <c>A2</c> →
/// <c>4A2</c>.
/// </summary>
public sealed class ClassFormat(string gradeSource, string classSource) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		var grade = sources.GetString(gradeSource);
		if (grade is null or "Private")
			return "Private";

		var digit = grade.Replace("Grade", string.Empty, StringComparison.Ordinal);
		var classValue = sources.GetString(classSource) ?? string.Empty;
		return digit + classValue;
	}
}
