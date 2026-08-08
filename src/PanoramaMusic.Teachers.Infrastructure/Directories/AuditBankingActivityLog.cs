using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Domain.Interfaces;
using PanoramaMusic.Teachers.Domain.ValueObjects;
using System.Text.Json;

namespace PanoramaMusic.Teachers.Infrastructure.Directories;

/// <summary>
/// Answers <see cref="IBankingActivityLog"/> out of the audit trail. It reads
/// only what the audit entries already hold, so the activity view cannot show
/// more than was recorded — in particular it cannot show an account number,
/// because none was ever written.
/// </summary>
public sealed class AuditBankingActivityLog(IAuditActivityReader activityReader) : IBankingActivityLog
{
	private const string _accountNumberLast4Key = "accountNumberLast4";

	public async Task<IList<BankingActivityEntry>> GetForTeacherAsync(Guid teacherId, CancellationToken cancellationToken)
	{
		var events = await activityReader.GetForTargetAsync(
			teacherId,
			TeacherAuditEventTypes.Banking,
			cancellationToken);

		return [.. events.Select(ToEntry)];
	}

	private static BankingActivityEntry ToEntry(AuditEvent auditEvent) =>
		new(
			auditEvent.OccurredAt,
			auditEvent.EventType,
			auditEvent.ActorEmail,
			ReadLast4(auditEvent));

	/// <summary>
	/// The detail bag arrives as deserialized JSON, so the value is a
	/// <see cref="JsonElement"/> rather than a string. An entry without the key
	/// yields null rather than throwing — an activity row that cannot name the
	/// last four digits is still worth showing.
	/// </summary>
	private static string? ReadLast4(AuditEvent auditEvent) =>
		auditEvent.Detail.TryGetValue(_accountNumberLast4Key, out var value) && value is JsonElement element
			? element.GetString()
			: null;
}