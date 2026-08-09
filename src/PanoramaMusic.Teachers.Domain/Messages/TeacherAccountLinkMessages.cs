namespace PanoramaMusic.Teachers.Domain.Messages;

/// <summary>
/// The refusals the account-link rules produce. They live in one place because
/// the same rule is enforced twice: once by the domain before the write, and
/// again by the database's unique index when two requests race. Both paths must
/// tell the caller the same thing.
/// </summary>
public static class TeacherAccountLinkMessages
{
	public const string AccountDoesNotExist = "The selected login account does not exist.";
	public const string AccountWithoutTeacherRole = "Only accounts holding the Teacher role can be linked to a teacher.";
	public const string AccountAlreadyLinked = "That login account is already linked to a teacher.";
	public const string TeacherAlreadyLinked = "This teacher is already linked to a login account. Unlink it first.";
	public const string TeacherNotLinked = "This teacher is not linked to a login account.";
	public const string TeacherNotActive = "A login account cannot be linked to a deactivated teacher.";
}