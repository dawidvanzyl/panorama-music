namespace PanoramaMusic.Reporting.Application.Models;

public sealed record SavedReportRunResult(
	Guid ReportId,
	string Name,
	string CreatedBy,
	bool IsOwner,
	DateTimeOffset RanAt,
	int StudentCount,
	IReadOnlyList<ReportRunColumnResult> Columns,
	IReadOnlyList<ReportRunSectionResult> Sections);