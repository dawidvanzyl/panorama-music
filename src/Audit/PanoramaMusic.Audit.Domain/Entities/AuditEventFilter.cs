namespace PanoramaMusic.Audit.Domain.Entities;

public sealed record AuditEventFilter(
	string? ActorEmail,
	string? EventType,
	DateTime? From,
	DateTime? To,
	int Page,
	int PageSize);