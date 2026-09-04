using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.Students;

namespace PanoramaMusic.Students.Infrastructure.Translators.Students;

public sealed class StudentCreatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is StudentCreated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var created = (StudentCreated)domainEvent;
		var student = created.Student;

		var detail = new Dictionary<string, object?>
		{
			["studentId"] = student.StudentId,
			["targetDisplay"] = $"{student.FirstName} {student.LastName}",
		};
		StudentWriteSourceDetail.Apply(detail, created.Source);

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentAuditEventTypes.StudentCreated,
			userContext.UserId,
			userContext.Email,
			null,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			detail);
	}
}