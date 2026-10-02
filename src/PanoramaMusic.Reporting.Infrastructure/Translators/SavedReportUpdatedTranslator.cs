using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Reporting.Application.Constants;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Domain.Events;
using PanoramaMusic.Reporting.Domain.ValueObjects;
using PanoramaMusic.Reporting.Infrastructure.Extensions;

namespace PanoramaMusic.Reporting.Infrastructure.Translators;

public sealed class SavedReportUpdatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is SavedReportUpdated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var updated = (SavedReportUpdated)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			ReportingAuditEventTypes.SavedReportUpdated,
			userContext.UserId,
			userContext.Email,
			updated.SavedReportId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = updated.NameAfter,
				["changes"] = Diff(updated),
			});
	}

	/// <summary>
	/// Only the fields that actually changed, each as a {before, after} pair —
	/// an unchanged field is omitted entirely rather than repeating its value
	/// on both sides.
	/// </summary>
	private static Dictionary<string, object?> Diff(SavedReportUpdated updated)
	{
		var changes = new Dictionary<string, object?>();

		if (updated.NameBefore != updated.NameAfter)
		{
			changes["name"] = new Dictionary<string, object?> { ["before"] = updated.NameBefore, ["after"] = updated.NameAfter };
		}

		if (DefinitionsDiffer(updated.DefinitionBefore, updated.DefinitionAfter))
		{
			changes["definition"] = new Dictionary<string, object?>
			{
				["before"] = updated.DefinitionBefore.ToDefinitionDto(),
				["after"] = updated.DefinitionAfter.ToDefinitionDto(),
			};
		}

		return changes;
	}

	private static bool DefinitionsDiffer(StoredReportDefinition before, StoredReportDefinition after) =>
		before.ToJson() != after.ToJson();
}