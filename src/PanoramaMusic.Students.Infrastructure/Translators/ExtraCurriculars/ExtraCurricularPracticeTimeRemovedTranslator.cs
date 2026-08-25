using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

namespace PanoramaMusic.Students.Infrastructure.Translators.ExtraCurriculars;

public sealed class ExtraCurricularPracticeTimeRemovedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is ExtraCurricularPracticeTimeRemoved;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var practiceTimeRemoved = (ExtraCurricularPracticeTimeRemoved)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			ExtraCurricularAuditEventTypes.PracticeTimeRemoved,
			userContext.UserId,
			userContext.Email,
			practiceTimeRemoved.ExtraCurricular.ExtraCurricularId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = practiceTimeRemoved.ExtraCurricular.Description,
				// The slot itself, since the activity no longer holds it — the
				// record has to say what went, not only that something did.
				["practiceTime"] = practiceTimeRemoved.PracticeTime.ToString(),
				["practiceTimeId"] = practiceTimeRemoved.PracticeTime.PracticeTimeId,
			});
	}
}