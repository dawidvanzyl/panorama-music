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

	/// <summary>
	/// Names the phase and the description that collided, e.g. Junior already has
	/// an activity called "Choir". A description is unique within its phase only —
	/// a Junior and a Senior Choir are two legitimately different activities.
	/// </summary>
	public static string DuplicateDescription(string phase, string description) =>
		$"{phase} already has an activity called \"{description}\".";

	/// <summary>
	/// Names the activity and how many students still take part in it, e.g. Choir
	/// has 24 assigned student(s) and cannot be deleted. The same wording is what
	/// the row-level banner shows.
	/// </summary>
	public static string CannotDeleteWithAssignedStudents(string description, int assignedStudents) =>
		$"{description} has {assignedStudents} assigned student(s) and cannot be deleted.";
}