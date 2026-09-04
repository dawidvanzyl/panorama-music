using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.Guardians;

namespace PanoramaMusic.Students.Infrastructure.Translators.Guardians;

public sealed class GuardianLinkedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is GuardianLinked;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var linked = (GuardianLinked)domainEvent;

		var detail = new Dictionary<string, object?>
		{
			["guardianId"] = linked.Guardian.GuardianId,
			["targetDisplay"] = $"{linked.Student.FirstName} {linked.Student.LastName} ↔ {linked.Guardian.FirstName} {linked.Guardian.Surname}",
		};
		StudentWriteSourceDetail.Apply(detail, linked.Source);

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			GuardianAuditEventTypes.GuardianLinked,
			userContext.UserId,
			userContext.Email,
			linked.Student.StudentId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			detail);
	}
}