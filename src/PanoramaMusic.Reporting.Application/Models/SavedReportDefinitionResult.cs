namespace PanoramaMusic.Reporting.Application.Models;

public sealed record SavedReportDefinitionResult(
	IReadOnlyList<SavedReportFilterResult> Filters,
	IReadOnlyList<string> Columns);