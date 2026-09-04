using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Events.Guardians;

namespace PanoramaMusic.Students.Infrastructure.Translators.Guardians;

public sealed class GuardianUpdatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is GuardianUpdated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var updated = (GuardianUpdated)domainEvent;
		var after = updated.After;

		var detail = new Dictionary<string, object?>
		{
			["targetDisplay"] = $"{after.FirstName} {after.Surname}",
			["changes"] = Diff(updated.Before, after),
		};
		StudentWriteSourceDetail.Apply(detail, updated.Source);

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			GuardianAuditEventTypes.GuardianUpdated,
			userContext.UserId,
			userContext.Email,
			after.GuardianId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			detail);
	}

	/// <summary>
	/// Only the fields that actually changed, each as a {before, after} pair —
	/// an unchanged field is omitted entirely rather than repeating its value
	/// on both sides.
	/// </summary>
	private static Dictionary<string, object?> Diff(Guardian before, Guardian after)
	{
		var changes = new Dictionary<string, object?>();

		AddIfChanged(changes, "guardianRelationshipId", before.GuardianRelationshipId.ToString(), after.GuardianRelationshipId.ToString());
		AddIfChanged(changes, "firstName", before.FirstName, after.FirstName);
		AddIfChanged(changes, "surname", before.Surname, after.Surname);
		AddIfChanged(changes, "cell", before.Cell, after.Cell);
		AddIfChanged(changes, "email", before.Email, after.Email);
		AddIfChanged(changes, "receivesCorrespondence", before.ReceivesCorrespondence.ToString(), after.ReceivesCorrespondence.ToString());
		AddIfChanged(changes, "responsibleForPayment", before.ResponsibleForPayment.ToString(), after.ResponsibleForPayment.ToString());
		AddIfChanged(changes, "married", before.Married.ToString(), after.Married.ToString());

		return changes;
	}

	private static void AddIfChanged(Dictionary<string, object?> changes, string field, string? beforeValue, string? afterValue)
	{
		if (beforeValue == afterValue)
			return;

		changes[field] = new Dictionary<string, object?> { ["before"] = beforeValue, ["after"] = afterValue };
	}
}