using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.Guardians;

namespace PanoramaMusic.Students.Infrastructure.Translators.Guardians;

public sealed class GuardianDeletedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is GuardianDeleted;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var guardian = ((GuardianDeleted)domainEvent).Guardian;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			GuardianAuditEventTypes.GuardianDeleted,
			userContext.UserId,
			userContext.Email,
			guardian.GuardianId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{guardian.FirstName} {guardian.Surname}",
			});
	}
}