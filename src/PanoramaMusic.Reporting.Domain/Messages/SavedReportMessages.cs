namespace PanoramaMusic.Reporting.Domain.Messages;

public static class SavedReportMessages
{
	public const string NameRequired = "A report name is required.";

	public const string NameTooLong = "A report name may be at most 100 characters.";

	public const string NotFound = "The saved report was not found.";

	public const string RemovedCreator = "(removed)";
}
