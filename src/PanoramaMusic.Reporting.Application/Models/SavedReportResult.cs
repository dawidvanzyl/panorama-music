namespace PanoramaMusic.Reporting.Application.Models;

public sealed record SavedReportResult(
	Guid Id,
	string Name,
	string CreatedBy,
	DateTime CreatedAt,
	DateTime? LastRunAt,
	bool IsOwner);