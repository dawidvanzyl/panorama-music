namespace PanoramaMusic.Audit.Application.Requests;

// "To" is a raw string rather than DateTime — AuditToDateResolver must see
// the original representation to tell a bare date apart from a precise
// timestamp. "From" has no such ambiguity (a bare date is already correct as
// an inclusive lower bound once parsed), so it stays a plain DateTime that
// ASP.NET Core model binding parses directly.
public sealed record GetAuditEventsRequest(
	string? Actor,
	string? EventType,
	DateTime? From,
	string? To,
	int Page = 1,
	int PageSize = 25);