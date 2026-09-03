using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.WaitingList;

namespace PanoramaMusic.Students.Infrastructure.Translators.WaitingList;

public sealed class WaitingListEntryRemovedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is WaitingListEntryRemoved;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var entry = ((WaitingListEntryRemoved)domainEvent).Entry;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			WaitingListAuditEventTypes.WaitingListEntryRemoved,
			userContext.UserId,
			userContext.Email,
			entry.WaitingListEntryId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = entry.ToString(),
				// The student record goes with the entry, so the removed student is
				// named here rather than only in the separate student-deleted event.
				["studentId"] = entry.Student.StudentId,
			});
	}
}
