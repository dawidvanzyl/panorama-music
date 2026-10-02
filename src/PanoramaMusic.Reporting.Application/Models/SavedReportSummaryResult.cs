namespace PanoramaMusic.Reporting.Application.Models;

public sealed record SavedReportSummaryResult(
	Guid Id,
	string Name,
	string CreatedBy,
	DateTime? LastRunAt,
	bool IsOwner);