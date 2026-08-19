using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.StudentCourses;

namespace PanoramaMusic.Students.Infrastructure.Translators.StudentCourses;

public sealed class StudentWithdrawnTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is StudentWithdrawn;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var (student, enrollment) = (StudentWithdrawn)domainEvent;
		var course = enrollment.Course;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentCourseAuditEventTypes.StudentWithdrawn,
			userContext.UserId,
			userContext.Email,
			enrollment.StudentCourseId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{student} · {course}",
				["studentId"] = student.StudentId,
				["courseId"] = course.CourseId,
			});
	}
}