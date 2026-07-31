namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by the Students context, following the
/// <c>{context}.{entity}.{action}</c> naming convention. Authoritative for
/// ASVS 5.0.0-16.3.3 — see <c>IdentityAuditEventTypes</c> for why the list lives in code
/// rather than in <c>docs/security-standards.md</c>.
/// </summary>
public static class StudentAuditEventTypes
{
	public const string StudentCreated = "students.student.created";
	public const string StudentUpdated = "students.student.updated";
	public const string StudentDeleted = "students.student.deleted";
	public const string SiblingAdded = "students.sibling.added";
	public const string SiblingRemoved = "students.sibling.removed";
}