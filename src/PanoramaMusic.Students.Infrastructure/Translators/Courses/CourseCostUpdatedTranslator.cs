using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Students.Application.Constants;
using PanoramaMusic.Students.Application.Interfaces;
using PanoramaMusic.Students.Domain.Events.Courses;
using System.Globalization;

namespace PanoramaMusic.Students.Infrastructure.Translators.Courses;

public sealed class CourseCostUpdatedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is CourseCostUpdated;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var updated = (CourseCostUpdated)domainEvent;
		var after = updated.After;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			CourseAuditEventTypes.CourseCostUpdated,
			userContext.UserId,
			userContext.Email,
			after.CourseId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["targetDisplay"] = $"{after.CourseType} · {after.LessonStructure}",
				["changes"] = new Dictionary<string, object?>
				{
					// Written as text so the amount is recorded exactly, never as a
					// serialized double.
					["cost"] = new Dictionary<string, object?>
					{
						["before"] = updated.Before.Cost.ToString(CultureInfo.InvariantCulture),
						["after"] = after.Cost.ToString(CultureInfo.InvariantCulture),
					},
				},
			});
	}
}