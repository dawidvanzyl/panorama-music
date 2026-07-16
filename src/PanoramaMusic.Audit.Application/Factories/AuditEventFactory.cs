using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;

namespace PanoramaMusic.Audit.Application.Factories;

public sealed class AuditEventFactory(IAuditContext auditContext) : IAuditEventFactory
{
	private static readonly IReadOnlyDictionary<string, object?> _emptyDetail =
		new Dictionary<string, object?>();

	public AuditEvent Create(
		string eventType,
		Guid? actorId,
		string? actorEmail,
		Guid? targetId,
		string outcome,
		string? reason = null,
		IReadOnlyDictionary<string, object?>? detail = null) =>
		new(
			Guid.NewGuid(),
			DateTime.UtcNow,
			eventType,
			actorId,
			actorEmail,
			targetId,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			outcome,
			reason,
			detail ?? _emptyDetail);
}