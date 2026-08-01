namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by the Students context for guardian records, following the
/// <c>{context}.{entity}.{action}</c> naming convention. Authoritative for
/// ASVS 5.0.0-16.3.3 — see <c>IdentityAuditEventTypes</c> for why the list lives in code
/// rather than in <c>docs/security-standards.md</c>.
/// </summary>
public static class GuardianAuditEventTypes
{
	public const string GuardianCreated = "students.guardian.created";
	public const string GuardianUpdated = "students.guardian.updated";
	public const string GuardianDeleted = "students.guardian.deleted";
	public const string GuardianLinked = "students.guardian.linked";
	public const string GuardianUnlinked = "students.guardian.unlinked";
}