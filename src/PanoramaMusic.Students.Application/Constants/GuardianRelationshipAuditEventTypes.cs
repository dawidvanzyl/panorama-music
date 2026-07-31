namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by guardian relationship-type maintenance,
/// following the <c>{context}.{entity}.{action}</c> convention of the Audit
/// Event Catalog.
/// </summary>
public static class GuardianRelationshipAuditEventTypes
{
	public const string GuardianRelationshipCreated = "students.guardian_relationship.created";

	public const string GuardianRelationshipRenamed = "students.guardian_relationship.renamed";

	public const string GuardianRelationshipDeleted = "students.guardian_relationship.deleted";
}