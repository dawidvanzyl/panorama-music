namespace PanoramaMusic.Persistence.Tests.Models;

public sealed record AuditEventRow(
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
	string Detail,
	string RawRow);