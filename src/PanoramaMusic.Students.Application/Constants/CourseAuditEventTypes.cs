namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by course maintenance, following the
/// <c>{context}.{entity}.{action}</c> naming convention. Authoritative for
/// ASVS 5.0.0-16.3.3 — see <c>IdentityAuditEventTypes</c> for why the list lives in code
/// rather than in <c>docs/security-standards.md</c>.
/// </summary>
public static class CourseAuditEventTypes
{
	public const string CourseCreated = "students.course.created";

	public const string CourseCostUpdated = "students.course.cost_updated";

	public const string CourseDeleted = "students.course.deleted";
}