using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

namespace PanoramaMusic.Students.Infrastructure.Translators.ExtraCurriculars;

public sealed class ExtraCurricularDeletedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is ExtraCurricularDeleted;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var extraCurricular = ((ExtraCurricularDeleted)domainEvent).ExtraCurricular;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			ExtraCurricularAuditEventTypes.ExtraCurricularDeleted,
			userContext.UserId,
			userContext.Email,
			extraCurricular.ExtraCurricularId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = extraCurricular.Description,
				["phase"] = extraCurricular.Phase.ToString(),
				// The slots went with the activity and nothing can read them back,
				// so the record is the only place they survive.
				["practiceTimes"] = string.Join(" · ", extraCurricular.PracticeTimes),
			});
	}
}
