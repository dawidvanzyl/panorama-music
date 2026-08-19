namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by course enrollment, following the
/// <c>{context}.{entity}.{action}</c> naming convention. Authoritative for
/// ASVS 5.0.0-16.3.3 — see <c>IdentityAuditEventTypes</c> for why the list lives in code
/// rather than in <c>docs/security-standards.md</c>.
/// </summary>
public static class StudentCourseAuditEventTypes
{
	public const string StudentEnrolled = "students.student_course.enrolled";

	public const string StudentEnrollmentUpdated = "students.student_course.updated";

	public const string StudentWithdrawn = "students.student_course.withdrawn";
}