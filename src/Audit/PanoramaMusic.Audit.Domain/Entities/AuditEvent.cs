namespace PanoramaMusic.Audit.Domain.Entities;

/// <summary>
/// An immutable, context-agnostic record of a security- or business-significant
/// event. <paramref name="EventType"/> is a free-form namespaced string of the
/// form <c>{context}.{entity}.{action}</c> so any bounded context can introduce
/// new event types without a schema change. <paramref name="TargetId"/> is null
/// for create events — the newly created record's id is captured in the
/// <paramref name="Detail"/> bag instead. The detail bag must never contain
/// passwords, raw tokens, or full hashes.
/// </summary>
public record AuditEvent(
	Guid Id,
	DateTime OccurredAt,
	string EventType,
	Guid? ActorId,
	string? ActorEmail,
	Guid? TargetId,
	string SourceIp,
	string UserAgent,
	Guid CorrelationId,
	string Outcome,
	string? Reason,
	IReadOnlyDictionary<string, object?> Detail)
{
	public DateTime OccurredAt { get; } = OccurredAt.Kind == DateTimeKind.Utc
		? OccurredAt
		: throw new ArgumentException("OccurredAt must be a UTC timestamp.", nameof(OccurredAt));
}