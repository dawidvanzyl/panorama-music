namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// One student's rows of already-formatted display cells, in column order,
/// plus the sibling badge to show beside their name when their sibling
/// group has another member present in the run.
/// </summary>
public sealed record ReportLayoutSection(Guid StudentId, IReadOnlyList<IReadOnlyList<string>> Rows, SiblingBadge? SiblingBadge);