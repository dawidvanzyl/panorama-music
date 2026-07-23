using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events;

namespace PanoramaMusic.Students.Infrastructure.Translators;

public sealed class SiblingAddedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is SiblingAdded;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var siblingAdded = (SiblingAdded)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentAuditEventTypes.SiblingAdded,
			userContext.UserId,
			userContext.Email,
			siblingAdded.Student.StudentId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["siblingId"] = siblingAdded.Sibling.StudentId,
				["targetDisplay"] = $"{siblingAdded.Student.FirstName} {siblingAdded.Student.LastName} ↔ {siblingAdded.Sibling.FirstName} {siblingAdded.Sibling.LastName}",
			});
	}
}