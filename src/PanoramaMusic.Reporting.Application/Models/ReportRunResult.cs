namespace PanoramaMusic.Reporting.Application.Models;

/// <summary>
/// The API contract for a completed run (ASVS 14.3.2 / 15.3.1 — sensitive,
/// carries only the selected columns' display cells, a student id and a
/// sibling badge; held in memory only, never persisted — ASVS 14.3.3).
/// </summary>
public sealed record ReportRunResult(
	DateTimeOffset RanAt,
	int StudentCount,
	IReadOnlyList<ReportRunColumnResult> Columns,
	IReadOnlyList<ReportRunSectionResult> Sections);