namespace PanoramaMusic.Students.Domain.Messages;

/// <summary>
/// Why an extra-curricular activity was refused. The same wording is what the
/// request validator reports and what the screen shows, so a refusal reads
/// identically wherever it surfaces.
/// </summary>
public static class ExtraCurricularMessages
{
	public const string AtLeastOnePracticeTimeRequired = "An activity must have at least one practice time.";

	/// <summary>
	/// Names the slot that was refused, e.g. "Monday 15:00 is already a practice
	/// time for this activity."
	/// </summary>
	public static string DuplicatePracticeTime(string practiceTime) =>
		$"{practiceTime} is already a practice time for this activity.";
}