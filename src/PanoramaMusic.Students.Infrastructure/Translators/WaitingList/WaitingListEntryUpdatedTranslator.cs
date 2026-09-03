using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Events.WaitingList;

namespace PanoramaMusic.Students.Infrastructure.Translators.WaitingList;

public sealed class WaitingListEntryUpdatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is WaitingListEntryUpdated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var updated = (WaitingListEntryUpdated)domainEvent;
		var after = updated.Entry;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			WaitingListAuditEventTypes.WaitingListEntryUpdated,
			userContext.UserId,
			userContext.Email,
			after.WaitingListEntryId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = after.ToString(),
				["changes"] = Diff(updated.Before, after),
			});
	}

	/// <summary>
	/// Only the fields that actually changed, each as a {before, after} pair —
	/// the same shape <c>StudentUpdatedTranslator</c> records. The occurrence,
	/// lesson and duration types travel together as the lesson structure, since
	/// that is what a single choice on the tab actually selects.
	/// </summary>
	private static Dictionary<string, object?> Diff(WaitingListEntry before, WaitingListEntry after)
	{
		var changes = new Dictionary<string, object?>();

		AddIfChanged(changes, "lessonStructure", before.LessonStructure.ToString(), after.LessonStructure.ToString());
		AddIfChanged(changes, "instrumentType", before.InstrumentType.ToString(), after.InstrumentType.ToString());
		AddIfChanged(changes, "notes", before.Notes, after.Notes);

		return changes;
	}

	private static void AddIfChanged(Dictionary<string, object?> changes, string field, string? beforeValue, string? afterValue)
	{
		if (beforeValue == afterValue)
			return;

		changes[field] = new Dictionary<string, object?> { ["before"] = beforeValue, ["after"] = afterValue };
	}
}
