namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>The Teacher column and the Teacher datasource options share this composition.</summary>
public static class TeacherLabel
{
	public static string Compose(string firstName, string surname, bool isActive)
	{
		var name = $"{firstName} {surname}";
		return isActive ? name : $"{name} (inactive)";
	}
}