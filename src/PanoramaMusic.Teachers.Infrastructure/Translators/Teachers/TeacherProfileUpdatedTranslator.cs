using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Entities;
using PanoramaMusic.Teachers.Domain.Events.Teachers;

namespace PanoramaMusic.Teachers.Infrastructure.Translators.Teachers;

public sealed class TeacherProfileUpdatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is TeacherProfileUpdated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var updated = (TeacherProfileUpdated)domainEvent;
		var after = updated.After;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			TeacherAuditEventTypes.TeacherProfileUpdated,
			userContext.UserId,
			userContext.Email,
			after.TeacherId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{after.FirstName} {after.Surname}",
				["changes"] = Diff(updated.Before, after),
			});
	}

	/// <summary>
	/// Only the fields that actually changed, each as a {before, after} pair —
	/// an unchanged field is omitted entirely rather than repeating its value
	/// on both sides.
	/// </summary>
	private static Dictionary<string, object?> Diff(Teacher before, Teacher after)
	{
		var changes = new Dictionary<string, object?>();

		AddIfChanged(changes, "firstName", before.FirstName, after.FirstName);
		AddIfChanged(changes, "surname", before.Surname, after.Surname);

		return changes;
	}

	private static void AddIfChanged(Dictionary<string, object?> changes, string field, string? beforeValue, string? afterValue)
	{
		if (beforeValue == afterValue)
			return;

		changes[field] = new Dictionary<string, object?> { ["before"] = beforeValue, ["after"] = afterValue };
	}
}