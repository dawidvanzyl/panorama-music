namespace PanoramaMusic.Teachers.Domain.Messages;

/// <summary>
/// The refusal a self-service caller gets when the signed-in account is linked
/// to no teacher. Deliberately says nothing about which accounts are linked or
/// which teachers exist — a caller with no record learns only that they have
/// none, never anything about anyone else's.
/// </summary>
public static class TeacherSelfServiceMessages
{
	public const string NoLinkedTeacher = "Your account is not linked to a teacher record.";
}