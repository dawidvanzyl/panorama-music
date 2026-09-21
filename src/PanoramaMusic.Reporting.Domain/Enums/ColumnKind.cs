namespace PanoramaMusic.Reporting.Domain.Enums;

/// <summary>
/// How a column's cell is produced. <c>Plain</c> reads one source verbatim;
/// <c>Composite</c> combines several (e.g. first + last name); <c>Scalar</c>
/// derives a value from a related collection computed set-wise (e.g. sibling
/// count); <c>Aggregate</c> is reserved for a future delimited roll-up over a
/// related collection — no #317 column uses it.
/// </summary>
public enum ColumnKind
{
	Plain,
	Composite,
	Scalar,
	Aggregate,
}