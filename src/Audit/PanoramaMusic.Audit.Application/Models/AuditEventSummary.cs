namespace PanoramaMusic.Audit.Application.Models;

/// <summary>
/// Display-appropriate projection of an <see cref="Domain.Entities.AuditEvent"/>
/// for the admin Activity Log. Never carries the raw detail JSONB bag or
/// internal ids (ASVS 15.3.1).
/// </summary>
public sealed record AuditEventSummary(
	DateTime OccurredAt,
	string EventType,
	string? ActorEmail,
	string? TargetDisplay,
	string Outcome,
	string? Reason,
	string SourceIp);