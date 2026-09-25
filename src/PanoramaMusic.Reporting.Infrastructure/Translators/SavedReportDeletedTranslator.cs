using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Reporting.Application.Constants;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Domain.Events;
using PanoramaMusic.Reporting.Infrastructure.Extensions;

namespace PanoramaMusic.Reporting.Infrastructure.Translators;

public sealed class SavedReportDeletedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is SavedReportDeleted;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var deleted = (SavedReportDeleted)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			ReportingAuditEventTypes.SavedReportDeleted,
			userContext.UserId,
			userContext.Email,
			deleted.SavedReportId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = deleted.Name,
				["definition"] = deleted.Definition.ToDefinitionDto(),
			});
	}
}
