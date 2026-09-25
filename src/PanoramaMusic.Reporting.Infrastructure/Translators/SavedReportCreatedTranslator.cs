using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Reporting.Application.Constants;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Domain.Events;
using PanoramaMusic.Reporting.Infrastructure.Extensions;

namespace PanoramaMusic.Reporting.Infrastructure.Translators;

public sealed class SavedReportCreatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is SavedReportCreated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var created = (SavedReportCreated)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			ReportingAuditEventTypes.SavedReportCreated,
			created.CreatedBy,
			userContext.Email,
			created.SavedReportId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = created.Name,
				["definition"] = created.Definition.ToDefinitionDto(),
			});
	}
}
