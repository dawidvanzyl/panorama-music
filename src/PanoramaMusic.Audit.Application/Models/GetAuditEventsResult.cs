namespace PanoramaMusic.Audit.Application.Models;

public sealed record GetAuditEventsResult(
	IReadOnlyList<AuditEventSummary> Items,
	int TotalCount,
	int Page,
	int PageSize);