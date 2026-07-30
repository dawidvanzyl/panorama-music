namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by the Students context, following the
/// <c>{context}.{entity}.{action}</c> convention of the Audit Event Catalog.
/// </summary>
public static class GuardianAuditEventTypes
{
	public const string GuardianCreated = "students.guardian.created";
	public const string GuardianUpdated = "students.guardian.updated";
	public const string GuardianDeleted = "students.guardian.deleted";
	public const string GuardianLinked = "students.guardian.linked";
	public const string GuardianUnlinked = "students.guardian.unlinked";
}