using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.StudentExtraCurriculars;

namespace PanoramaMusic.Students.Infrastructure.Translators.StudentExtraCurriculars;

public sealed class StudentAssignedToExtraCurricularTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is StudentAssignedToExtraCurricular;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var (student, assignment) = (StudentAssignedToExtraCurricular)domainEvent;
		var extraCurricular = assignment.ExtraCurricular;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentExtraCurricularAuditEventTypes.StudentAssigned,
			userContext.UserId,
			userContext.Email,
			// The student is the target: the assignment has no identity of its own,
			// and the student's record is where the change is looked for.
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
