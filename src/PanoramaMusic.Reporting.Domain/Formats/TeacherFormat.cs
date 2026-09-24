using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>Teacher column: the name, ' (inactive)' when inactive, or '(removed)' when the teacher no longer exists.</summary>
public sealed class TeacherFormat(
	string firstNameSource,
	string surnameSource,
	string isActiveSource,
	string existsSource) : IColumnFormat
{
	public string Format(SourceValues sources)
	{
		if (!sources.GetBoolean(existsSource))
			return "(removed)";

		var firstName = sources.GetString(firstNameSource) ?? string.Empty;
		var surname = sources.GetString(surnameSource) ?? string.Empty;
		return TeacherLabel.Compose(firstName, surname, sources.GetBoolean(isActiveSource));
	}
}
