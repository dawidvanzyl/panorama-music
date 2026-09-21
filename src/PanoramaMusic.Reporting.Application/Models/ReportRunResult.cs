namespace PanoramaMusic.Reporting.Application.Models;

public sealed record ReportRunColumnResult(string Key, string Header);

public sealed record ReportRunSectionResult(Guid StudentId, IReadOnlyList<IReadOnlyList<string>> Rows);

/// <summary>
/// The API contract for a completed run (ASVS 14.3.2 / 15.3.1 — sensitive,
/// carries only the selected columns' display cells plus a student id; held
/// in memory only, never persisted — ASVS 14.3.3).
/// </summary>
public sealed record ReportRunResult(
	DateTimeOffset RanAt,
	int StudentCount,
	IReadOnlyList<ReportRunColumnResult> Columns,
	IReadOnlyList<ReportRunSectionResult> Sections);
