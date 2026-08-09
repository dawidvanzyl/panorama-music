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
	public const string TeacherAccountLinked = "teachers.teacher.account_linked";
	public const string TeacherAccountUnlinked = "teachers.teacher.account_unlinked";
	public const string TeacherDeactivated = "teachers.teacher.deactivated";
	public const string TeacherReactivated = "teachers.teacher.reactivated";
	public const string TeacherDeleted = "teachers.teacher.deleted";
	public const string BankingDetailsCaptured = "teachers.banking_details.captured";
	public const string BankingDetailsAmended = "teachers.banking_details.amended";
	public const string BankingDetailsDeleted = "teachers.banking_details.deleted";
	public const string BankingDetailsRevealed = "teachers.banking_details.revealed";

	/// <summary>
	/// The banking event types, in the order the banking activity view names
	/// them. Both the translators that write these entries and the activity
	/// query that reads them back work from this one list, so an event type
	/// added here cannot be silently missing from the view.
	/// </summary>
	public static readonly IReadOnlyList<string> Banking =
	[
		BankingDetailsCaptured,
		BankingDetailsAmended,
		BankingDetailsDeleted,
		BankingDetailsRevealed,
	];
}