using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.Siblings;

namespace PanoramaMusic.Students.Infrastructure.Translators.Siblings;

public sealed class SiblingRemovedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is SiblingRemoved;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var siblingRemoved = (SiblingRemoved)domainEvent;

		var detail = new Dictionary<string, object?>
		{
			["siblingId"] = siblingRemoved.Sibling.StudentId,
			["targetDisplay"] = $"{siblingRemoved.Student.FirstName} {siblingRemoved.Student.LastName} ↔ {siblingRemoved.Sibling.FirstName} {siblingRemoved.Sibling.LastName}",
		};
		StudentWriteSourceDetail.Apply(detail, siblingRemoved.Source);

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
			detail);
	}
}