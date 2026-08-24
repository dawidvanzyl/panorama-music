using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

namespace PanoramaMusic.Students.Infrastructure.Translators.ExtraCurriculars;

public sealed class ExtraCurricularCreatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is ExtraCurricularCreated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var extraCurricular = ((ExtraCurricularCreated)domainEvent).ExtraCurricular;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			ExtraCurricularAuditEventTypes.ExtraCurricularCreated,
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
				// The slots are what the activity was actually defined with, so
				// the record says what was created rather than only that
				// something was.
				["practiceTimes"] = string.Join(" · ", extraCurricular.PracticeTimes),
			});
	}
}
