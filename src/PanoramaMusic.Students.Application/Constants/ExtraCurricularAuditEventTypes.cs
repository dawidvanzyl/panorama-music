namespace PanoramaMusic.Students.Application.Constants;

/// <summary>
/// Audit event types emitted by extra-curricular maintenance, following the
/// <c>{context}.{entity}.{action}</c> naming convention. Authoritative for
/// ASVS 5.0.0-16.3.3 — see <c>IdentityAuditEventTypes</c> for why the list lives in code
/// rather than in <c>docs/security-standards.md</c>.
/// </summary>
public static class ExtraCurricularAuditEventTypes
{
	public const string ExtraCurricularCreated = "students.extra_curricular.created";

	public const string ExtraCurricularUpdated = "students.extra_curricular.updated";

	public const string ExtraCurricularDeleted = "students.extra_curricular.deleted";

	public const string PracticeTimeAdded = "students.extra_curricular.practice_time_added";

	public const string PracticeTimeRemoved = "students.extra_curricular.practice_time_removed";
}