namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// One student's rows of already-formatted display cells, in column order,
/// plus the sibling badge to show beside their name when their sibling
/// group has another member present in the run.
/// </summary>
public sealed record ReportLayoutSection(Guid StudentId, IReadOnlyList<IReadOnlyList<string>> Rows, SiblingBadge? SiblingBadge);

/// <summary>
/// The run's finished output: the columns in display order and one section per
/// matching student, in population order. A section holds as many rows as
/// the largest record count among the selected non-Student collections, at
/// least one.
/// </summary>
public sealed record ReportLayout(IReadOnlyList<ColumnAttribute> Columns, IReadOnlyList<ReportLayoutSection> Sections);