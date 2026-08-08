using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Events.Banking;

namespace PanoramaMusic.Teachers.Infrastructure.Translators.Banking;

/// <summary>
/// Records that a teacher's banking details were deleted. The last four digits
/// are all that remains identifiable about the removed record, and all this
/// entry carries — the protected number goes with the row and is not recoverable
/// from here.
/// </summary>
public sealed class BankingDetailsDeletedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is BankingDetailsDeleted;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var deleted = (BankingDetailsDeleted)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			TeacherAuditEventTypes.BankingDetailsDeleted,
			userContext.UserId,
			userContext.Email,
			deleted.TeacherId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["accountNumberLast4"] = deleted.AccountNumberLast4,
			});
	}
}