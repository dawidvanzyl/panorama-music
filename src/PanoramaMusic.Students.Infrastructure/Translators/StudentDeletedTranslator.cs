using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events;

namespace PanoramaMusic.Students.Infrastructure.Translators;

public sealed class StudentDeletedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is StudentDeleted;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var student = ((StudentDeleted)domainEvent).Student;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentAuditEventTypes.StudentDeleted,
			userContext.UserId,
			userContext.Email,
			student.StudentId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{student.FirstName} {student.LastName}",
			});
	}
}