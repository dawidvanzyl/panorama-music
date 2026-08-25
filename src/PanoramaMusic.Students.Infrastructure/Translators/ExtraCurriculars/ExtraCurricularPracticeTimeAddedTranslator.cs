using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

namespace PanoramaMusic.Students.Infrastructure.Translators.ExtraCurriculars;

public sealed class ExtraCurricularPracticeTimeAddedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is ExtraCurricularPracticeTimeAdded;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var practiceTimeAdded = (ExtraCurricularPracticeTimeAdded)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			ExtraCurricularAuditEventTypes.PracticeTimeAdded,
			userContext.UserId,
			userContext.Email,
			// The activity is the target: a slot has no meaning apart from the
			// activity that owns it, and this is where the change is looked for.
			practiceTimeAdded.ExtraCurricular.ExtraCurricularId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = practiceTimeAdded.ExtraCurricular.Description,
				["practiceTime"] = practiceTimeAdded.PracticeTime.ToString(),
				["practiceTimeId"] = practiceTimeAdded.PracticeTime.PracticeTimeId,
			});
	}
}
