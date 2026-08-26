namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by a student's extra-curricular participation,
/// following the <c>{context}.{entity}.{action}</c> naming convention.
/// Authoritative for ASVS 5.0.0-16.3.3 — see <c>IdentityAuditEventTypes</c> for why
/// the list lives in code rather than in <c>docs/security-standards.md</c>.
/// </summary>
public static class StudentExtraCurricularAuditEventTypes
{
	public const string StudentAssigned = "students.student_extra_curricular.assigned";

	public const string StudentRemoved = "students.student_extra_curricular.removed";
}
