namespace PanoramaMusic.Reporting.Application.Models;

public sealed record ReportRunSectionResult(Guid StudentId, IReadOnlyList<IReadOnlyList<string>> Rows, string? SiblingBadge);