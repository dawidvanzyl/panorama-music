using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.GuardianRelationships;

namespace PanoramaMusic.Students.Infrastructure.Translators.GuardianRelationships;

public sealed class GuardianRelationshipRenamedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is GuardianRelationshipRenamed;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var renamed = (GuardianRelationshipRenamed)domainEvent;
		var after = renamed.After;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			GuardianRelationshipAuditEventTypes.GuardianRelationshipRenamed,
			userContext.UserId,
			userContext.Email,
			after.GuardianRelationshipId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = after.Name,
				["changes"] = new Dictionary<string, object?>
				{
					["name"] = new Dictionary<string, object?> { ["before"] = renamed.Before.Name, ["after"] = after.Name },
				},
			});
	}
}