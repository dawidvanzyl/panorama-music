namespace PanoramaMusic.Reporting.Application.Models;

public sealed record ReportFieldsResult(
	IReadOnlyList<ReportFilterFieldResult> Filters,
	IReadOnlyList<ReportColumnFieldResult> Columns);