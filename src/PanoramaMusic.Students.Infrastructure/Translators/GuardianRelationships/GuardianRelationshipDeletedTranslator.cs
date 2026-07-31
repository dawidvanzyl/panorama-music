using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.GuardianRelationships;

namespace PanoramaMusic.Students.Infrastructure.Translators.GuardianRelationships;

public sealed class GuardianRelationshipDeletedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is GuardianRelationshipDeleted;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var relationship = ((GuardianRelationshipDeleted)domainEvent).Relationship;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			GuardianRelationshipAuditEventTypes.GuardianRelationshipDeleted,
			userContext.UserId,
			userContext.Email,
			relationship.GuardianRelationshipId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = relationship.Name,
			});
	}
}