using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Events;

namespace PanoramaMusic.Students.Infrastructure.Translators;

public sealed class StudentUpdatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is StudentUpdated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var updated = (StudentUpdated)domainEvent;
		var after = updated.After;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentAuditEventTypes.StudentUpdated,
			userContext.UserId,
			userContext.Email,
			after.StudentId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{after.FirstName} {after.LastName}",
				["changes"] = Diff(updated.Before, after),
			});
	}

	/// <summary>
	/// Only the fields that actually changed, each as a {before, after} pair —
	/// an unchanged field is omitted entirely rather than repeating its value
	/// on both sides.
	/// </summary>
	private static Dictionary<string, object?> Diff(Student before, Student after)
	{
		var changes = new Dictionary<string, object?>();

		AddIfChanged(changes, "firstName", before.FirstName, after.FirstName);
		AddIfChanged(changes, "lastName", before.LastName, after.LastName);
		AddIfChanged(changes, "dateOfBirth", before.DateOfBirth.ToString("O"), after.DateOfBirth.ToString("O"));
		AddIfChanged(changes, "grade", before.Grade.ToString(), after.Grade.ToString());
		AddIfChanged(changes, "class", before.Class.ToString(), after.Class.ToString());
		AddIfChanged(changes, "phase", before.Phase.ToString(), after.Phase.ToString());
		AddIfChanged(changes, "language", before.Language.ToString(), after.Language.ToString());

		return changes;
	}

	private static void AddIfChanged(Dictionary<string, object?> changes, string field, string? beforeValue, string? afterValue)
	{
		if (beforeValue == afterValue)
			return;

		changes[field] = new Dictionary<string, object?> { ["before"] = beforeValue, ["after"] = afterValue };
	}
}