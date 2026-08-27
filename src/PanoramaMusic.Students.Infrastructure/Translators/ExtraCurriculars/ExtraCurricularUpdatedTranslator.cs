using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.ExtraCurriculars;

namespace PanoramaMusic.Students.Infrastructure.Translators.ExtraCurriculars;

public sealed class ExtraCurricularUpdatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is ExtraCurricularUpdated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var updated = (ExtraCurricularUpdated)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			ExtraCurricularAuditEventTypes.ExtraCurricularUpdated,
			userContext.UserId,
			userContext.Email,
			updated.After.ExtraCurricularId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = updated.After.Description,
				// Both sides of each change: a record saying only what the activity
				// now reads as cannot answer what it was corrected from.
				["descriptionBefore"] = updated.Before.Description,
				["descriptionAfter"] = updated.After.Description,
				["phaseBefore"] = updated.Before.Phase.ToString(),
				["phaseAfter"] = updated.After.Phase.ToString(),
			});
	}
}