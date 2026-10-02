using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

public sealed class GuardianNameFormat(string firstNameSource, string surnameSource, string relationshipSource)
	: IColumnFormat
{
	public string Format(SourceValues sources)
	{
		var firstName = sources.GetString(firstNameSource) ?? string.Empty;
		var surname = sources.GetString(surnameSource) ?? string.Empty;
		var relationship = sources.GetString(relationshipSource) ?? string.Empty;
		return $"{firstName} {surname} · {relationship}";
	}
}