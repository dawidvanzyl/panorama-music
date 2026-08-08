using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Events.Banking;

namespace PanoramaMusic.Teachers.Infrastructure.Translators.Banking;

/// <summary>
/// Records that the full account number was unprotected and handed to a caller.
/// The one banking entry that describes a read, because revealing is the one
/// read that exposes the value the rest of this design exists to protect — and,
/// like every other banking entry, it carries only the last four digits.
/// </summary>
public sealed class BankingDetailsRevealedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is BankingDetailsRevealed;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var revealed = (BankingDetailsRevealed)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			TeacherAuditEventTypes.BankingDetailsRevealed,
			userContext.UserId,
			userContext.Email,
			revealed.TeacherId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["accountNumberLast4"] = revealed.AccountNumberLast4,
			});
	}
}