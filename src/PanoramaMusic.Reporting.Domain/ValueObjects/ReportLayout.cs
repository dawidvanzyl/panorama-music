namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>One student's rows of already-formatted display cells, in column order.</summary>
public sealed record ReportLayoutSection(Guid StudentId, IReadOnlyList<IReadOnlyList<string>> Rows);

/// <summary>
/// The run's finished output: the columns in display order and one section per
/// matching student, in population order. Each section currently holds
/// exactly one row, since Student is the only selected collection; a
/// non-Student collection's fan-out adds more rows to a section once one is
/// selected.
/// </summary>
public sealed record ReportLayout(IReadOnlyList<ColumnAttribute> Columns, IReadOnlyList<ReportLayoutSection> Sections);