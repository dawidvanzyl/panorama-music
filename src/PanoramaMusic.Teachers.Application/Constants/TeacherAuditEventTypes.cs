namespace PanoramaMusic.Teachers.Application.Constants;

/// <summary>
/// Audit event types emitted by the Teachers context, following the
/// <c>{context}.{entity}.{action}</c> naming convention. Authoritative for
/// ASVS 5.0.0-16.3.3 — see Students' equivalent for why the list lives in
/// code rather than in <c>docs/security-standards.md</c>.
/// </summary>
public static class TeacherAuditEventTypes
{
	public const string TeacherCreated = "teachers.teacher.created";
	public const string TeacherProfileUpdated = "teachers.teacher.profile_updated";
	public const string TeacherClassificationChanged = "teachers.teacher.classification_changed";
}