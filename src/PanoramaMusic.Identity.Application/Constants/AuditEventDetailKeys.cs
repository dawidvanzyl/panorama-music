namespace PanoramaMusic.Identity.Application.Constants;

public static class AuditEventDetailKeys
{
	/// <summary>
	/// Human-readable identifier for the audited subject. Per the PII rule in §14.2 of
	/// <c>docs/security-standards.md</c>, this must be the least identifying value that still
	/// supports an investigation — an email wherever the subject holds an account.
	/// <para>
	/// The Students context is the documented exception: students are minors with no account
	/// or email of their own, so their full name is the only human-readable identifier
	/// available. That is permitted because the audit trail is gated to the same Teacher/Admin
	/// population that can already read every student's name from the roster, so it widens
	/// nobody's view of personal data. Recording a name for a subject who *does* have an
	/// account would not meet that test.
	/// </para>
	/// </summary>
	public const string TargetDisplay = "targetDisplay";
	public const string Roles = "roles";
	public const string RolesBefore = "rolesBefore";
	public const string RolesAfter = "rolesAfter";
}