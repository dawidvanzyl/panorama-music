namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>
/// The Activity filter's datasource option label only (R12): <c>{description} ({phase})</c>,
/// e.g. <c>Choir (Junior)</c>. The Activity column stays the description alone.
/// </summary>
public static class ActivityOptionLabel
{
	public static string Compose(string description, string phase) => $"{description} ({phase})";
}
