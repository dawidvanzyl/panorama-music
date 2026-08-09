namespace PanoramaMusic.Teachers.Domain.Messages;

/// <summary>
/// The refusals the teacher lifecycle rules produce. Deletion is guarded rather
/// than merely hidden: the interface withholds the action while a teacher is
/// active, but the rule that actually decides is here.
/// </summary>
public static class TeacherLifecycleMessages
{
	public const string TeacherAlreadyDeactivated = "This teacher is already deactivated.";
	public const string TeacherAlreadyActive = "This teacher is already active.";
	public const string TeacherMustBeDeactivatedBeforeDeletion =
		"Only a deactivated teacher can be permanently deleted. Deactivate the teacher first.";
}