namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>One student's rows of already-formatted display cells, in column order.</summary>
public sealed record ReportLayoutSection(Guid StudentId, IReadOnlyList<IReadOnlyList<string>> Rows);

/// <summary>
/// The run's finished output: the columns in display order and one section per
/// matching student, in population order. #317 gives each section exactly one
/// row, since Student is the only selected collection; #318's fan-out adds
/// more.
/// </summary>
public sealed record ReportLayout(IReadOnlyList<ColumnAttribute> Columns, IReadOnlyList<ReportLayoutSection> Sections);
