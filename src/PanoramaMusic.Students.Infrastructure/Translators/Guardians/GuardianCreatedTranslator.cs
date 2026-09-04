using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.Guardians;

namespace PanoramaMusic.Students.Infrastructure.Translators.Guardians;

public sealed class GuardianCreatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is GuardianCreated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var created = (GuardianCreated)domainEvent;
		var guardian = created.Guardian;

		var detail = new Dictionary<string, object?>
		{
			["targetDisplay"] = $"{guardian.FirstName} {guardian.Surname}",
		};
		StudentWriteSourceDetail.Apply(detail, created.Source);

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			GuardianAuditEventTypes.GuardianCreated,
			userContext.UserId,
			userContext.Email,
			guardian.GuardianId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			detail);
	}
}