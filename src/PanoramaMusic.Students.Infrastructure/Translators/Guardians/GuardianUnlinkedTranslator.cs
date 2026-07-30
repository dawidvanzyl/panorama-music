using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.Guardians;

namespace PanoramaMusic.Students.Infrastructure.Translators.Guardians;

public sealed class GuardianUnlinkedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is GuardianUnlinked;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var unlinked = (GuardianUnlinked)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			GuardianAuditEventTypes.GuardianUnlinked,
			userContext.UserId,
			userContext.Email,
			unlinked.Student.StudentId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["guardianId"] = unlinked.Guardian.GuardianId,
				["targetDisplay"] = $"{unlinked.Student.FirstName} {unlinked.Student.LastName} ⊘ {unlinked.Guardian.FirstName} {unlinked.Guardian.Surname}",
			});
	}
}