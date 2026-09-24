using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Formats;

/// <summary>
/// Turns a column's raw source values into the display text a results cell
/// renders. Every implementation is pure and framework-free — no SQL, no
/// culture-dependent formatting beyond what each format explicitly fixes
/// (e.g. invariant <c>yyyy-MM-dd</c> dates).
/// </summary>
public interface IColumnFormat
{
	string Format(SourceValues sources);
}