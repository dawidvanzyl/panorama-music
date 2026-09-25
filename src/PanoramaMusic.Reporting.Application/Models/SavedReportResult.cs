namespace PanoramaMusic.Reporting.Application.Models;

public sealed record SavedReportResult(
	Guid Id,
	string Name,
	string CreatedBy,
	DateTime CreatedAt,
	DateTime? LastRunAt,
	bool IsOwner);

public sealed record SavedReportSummaryResult(
	Guid Id,
	string Name,
	string CreatedBy,
	DateTime? LastRunAt,
	bool IsOwner);

public sealed record SavedReportFilterResult(string Field, string Operator, IReadOnlyList<string> Values);

public sealed record SavedReportDefinitionResult(
	IReadOnlyList<SavedReportFilterResult> Filters,
	IReadOnlyList<string> Columns);

public sealed record SavedReportDetailResult(
	Guid Id,
	string Name,
	string CreatedBy,
	DateTime? LastRunAt,
	bool IsOwner,
	SavedReportDefinitionResult Definition);

public sealed record SavedReportRunResult(
	Guid ReportId,
	string Name,
	string CreatedBy,
	bool IsOwner,
	DateTimeOffset RanAt,
	int StudentCount,
	IReadOnlyList<ReportRunColumnResult> Columns,
	IReadOnlyList<ReportRunSectionResult> Sections);