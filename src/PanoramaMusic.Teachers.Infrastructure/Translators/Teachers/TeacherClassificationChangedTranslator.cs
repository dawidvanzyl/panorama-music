using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Events.Teachers;

namespace PanoramaMusic.Teachers.Infrastructure.Translators.Teachers;

public sealed class TeacherClassificationChangedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is TeacherClassificationChanged;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var changed = (TeacherClassificationChanged)domainEvent;
		var after = changed.After;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			TeacherAuditEventTypes.TeacherClassificationChanged,
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
				["changes"] = new Dictionary<string, object?>
				{
					["isPrivate"] = new Dictionary<string, object?>
					{
						["before"] = changed.Before.IsPrivate,
						["after"] = after.IsPrivate,
					},
				},
			});
	}
}