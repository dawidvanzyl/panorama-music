namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by guardian relationship-type maintenance, following the
/// <c>{context}.{entity}.{action}</c> naming convention. Authoritative for
/// ASVS 5.0.0-16.3.3 — see <c>IdentityAuditEventTypes</c> for why the list lives in code
/// rather than in <c>docs/security-standards.md</c>.
/// </summary>
public static class GuardianRelationshipAuditEventTypes
{
	public const string GuardianRelationshipCreated = "students.guardian_relationship.created";

	public const string GuardianRelationshipRenamed = "students.guardian_relationship.renamed";

	public const string GuardianRelationshipDeleted = "students.guardian_relationship.deleted";
}