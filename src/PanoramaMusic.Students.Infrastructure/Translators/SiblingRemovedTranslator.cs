using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events;

namespace PanoramaMusic.Students.Infrastructure.Translators;

public sealed class SiblingRemovedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is SiblingRemoved;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var siblingRemoved = (SiblingRemoved)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			StudentAuditEventTypes.SiblingRemoved,
			userContext.UserId,
			userContext.Email,
			siblingRemoved.Student.StudentId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["siblingId"] = siblingRemoved.Sibling.StudentId,
				["targetDisplay"] = $"{siblingRemoved.Student.FirstName} {siblingRemoved.Student.LastName} ↔ {siblingRemoved.Sibling.FirstName} {siblingRemoved.Sibling.LastName}",
			});
	}
}