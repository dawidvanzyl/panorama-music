using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Events.Banking;

namespace PanoramaMusic.Teachers.Infrastructure.Translators.Banking;

/// <summary>
/// Records that a teacher's banking details were captured for the first time.
/// The detail bag carries the last four digits and nothing else — the audit
/// table outlives the banking record, so anything written here survives the
/// retention boundary the milestone sets.
/// </summary>
public sealed class BankingDetailsCapturedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is BankingDetailsCaptured;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var captured = (BankingDetailsCaptured)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			TeacherAuditEventTypes.BankingDetailsCaptured,
			userContext.UserId,
			userContext.Email,
			captured.TeacherId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["accountNumberLast4"] = captured.AccountNumberLast4,
			});
	}
}