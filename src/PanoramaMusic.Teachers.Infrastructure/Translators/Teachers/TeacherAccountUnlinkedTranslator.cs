using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Events.Teachers;

namespace PanoramaMusic.Teachers.Infrastructure.Translators.Teachers;

public sealed class TeacherAccountUnlinkedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is TeacherAccountUnlinked;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var unlinked = (TeacherAccountUnlinked)domainEvent;
		var teacher = unlinked.Teacher;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			TeacherAuditEventTypes.TeacherAccountUnlinked,
			userContext.UserId,
			userContext.Email,
			teacher.TeacherId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{teacher.FirstName} {teacher.Surname}",
				["accountId"] = unlinked.PreviousAccountId,
			});
	}
}