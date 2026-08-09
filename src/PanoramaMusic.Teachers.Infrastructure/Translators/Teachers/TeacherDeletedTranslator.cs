using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Events.Teachers;

namespace PanoramaMusic.Teachers.Infrastructure.Translators.Teachers;

/// <summary>
/// Records a permanent deletion. The teacher's name is carried on the entry
/// because the row it came from no longer exists to be looked up.
/// </summary>
public sealed class TeacherDeletedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is TeacherDeleted;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var teacher = ((TeacherDeleted)domainEvent).Teacher;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			TeacherAuditEventTypes.TeacherDeleted,
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
			});
	}
}