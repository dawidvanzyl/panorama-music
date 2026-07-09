namespace PanoramaMusic.Audit.Application.Requests;

public sealed record GetAuditEventsRequest(
	string? Actor,
	string? EventType,
	DateTime? From,
	DateTime? To,
	int Page = 1,
	int PageSize = 25);