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
}