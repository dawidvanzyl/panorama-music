using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.Courses;

namespace PanoramaMusic.Students.Infrastructure.Translators.Courses;

public sealed class CourseDeletedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is CourseDeleted;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var course = ((CourseDeleted)domainEvent).Course;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			CourseAuditEventTypes.CourseDeleted,
			userContext.UserId,
			userContext.Email,
			course.CourseId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{course.CourseType} · {course.LessonStructure}",
			});
	}
}