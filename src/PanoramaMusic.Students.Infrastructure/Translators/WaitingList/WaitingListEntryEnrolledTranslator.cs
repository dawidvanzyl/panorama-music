using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.WaitingList;

namespace PanoramaMusic.Students.Infrastructure.Translators.WaitingList;

public sealed class WaitingListEntryEnrolledTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is WaitingListEntryEnrolled;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var (entry, enrollment) = (WaitingListEntryEnrolled)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			WaitingListAuditEventTypes.WaitingListEntryEnrolled,
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
				["studentId"] = entry.Student.StudentId,
				// The enrollment that consumed the entry, so the pair can be read
				// back together rather than only inferred from their timing.
				["studentCourseId"] = enrollment.StudentCourseId,
				["courseId"] = enrollment.Course.CourseId,
			});
	}
}
