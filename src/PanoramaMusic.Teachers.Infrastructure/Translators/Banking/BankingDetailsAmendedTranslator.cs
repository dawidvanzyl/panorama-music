using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;
using PanoramaMusic.Teachers.Application.Constants;
using PanoramaMusic.Teachers.Application.Interfaces;
using PanoramaMusic.Teachers.Domain.Events.Banking;

namespace PanoramaMusic.Teachers.Infrastructure.Translators.Banking;

/// <summary>
/// Records that a teacher's banking details were changed. The only banking
/// entry carrying a <c>changes</c> bag, and the bag holds flags rather than
/// values: a reader learns which fields moved without the old or new value ever
/// entering a table that outlives the banking record itself.
/// </summary>
public sealed class BankingDetailsAmendedTranslator(IAuditContext auditContext, IUserContext userContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is BankingDetailsAmended;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var amended = (BankingDetailsAmended)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			TeacherAuditEventTypes.BankingDetailsAmended,
			userContext.UserId,
			userContext.Email,
			amended.TeacherId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>
			{
				["accountNumberLast4"] = amended.AccountNumberLast4,
				["changes"] = AddChangedFields(amended)
			});
	}

	/// <summary>
	/// Names the fields an edit moved, and only those — an unchanged field is
	/// omitted rather than recorded as false, mirroring how the teacher-profile
	/// diff omits fields that did not change. Every value here is a boolean by
	/// construction: there is no path by which a banking value itself can reach
	/// the detail bag.
	/// </summary>
	private static Dictionary<string, object?> AddChangedFields(BankingDetailsAmended amended)
	{
		var changes = new Dictionary<string, object?>();

		AddIfChanged(changes, "bankChanged", amended.BankChanged);
		AddIfChanged(changes, "accountTypeChanged", amended.AccountTypeChanged);
		AddIfChanged(changes, "branchCodeChanged", amended.BranchCodeChanged);
		AddIfChanged(changes, "accountNumberChanged", amended.AccountNumberChanged);

		return changes;
	}

	private static void AddIfChanged(Dictionary<string, object?> changes, string field, bool changed)
	{
		if (changed)
			changes[field] = true;
	}
}