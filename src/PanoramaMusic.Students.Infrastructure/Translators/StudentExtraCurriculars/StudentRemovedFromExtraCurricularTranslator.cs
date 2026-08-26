using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.StudentExtraCurriculars;

namespace PanoramaMusic.Students.Infrastructure.Translators.StudentExtraCurriculars;

public sealed class StudentRemovedFromExtraCurricularTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is StudentRemovedFromExtraCurricular;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var (student, assignment) = (StudentRemovedFromExtraCurricular)domainEvent;
		var extraCurricular = assignment.ExtraCurricular;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentExtraCurricularAuditEventTypes.StudentRemoved,
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
				["targetDisplay"] = $"{student} · {extraCurricular}",
				["studentId"] = student.StudentId,
				["extraCurricularId"] = extraCurricular.ExtraCurricularId,
			});
	}
}
