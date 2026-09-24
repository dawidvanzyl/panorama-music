using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Formats;

namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// A field a report can project as a column, as the registry declares it.
/// <see cref="Sources"/> names the logical source values (resolved to SQL only
/// by the Infrastructure catalog) this column's <see cref="Format"/> needs.
/// </summary>
public sealed class ColumnAttribute
{
	public ColumnAttribute(
		string key,
		string header,
		ReportCollection collection,
		ColumnKind kind,
		int displayOrder,
		string? dependsOn,
		bool locked,
		IReadOnlyList<string> sources,
		IColumnFormat format)
	{
		Key = key;
		Header = header;
		Collection = collection;
		Kind = kind;
		DisplayOrder = displayOrder;
		DependsOn = dependsOn;
		Locked = locked;
		Sources = sources;
		Format = format;
	}

	public string Key { get; }

	public string Header { get; }

	public ReportCollection Collection { get; }

	public ColumnKind Kind { get; }

	public int DisplayOrder { get; }

	public string? DependsOn { get; }

	/// <summary>True only for Student — always present, cannot be unticked.</summary>
	public bool Locked { get; }

	public IReadOnlyList<string> Sources { get; }

	public IColumnFormat Format { get; }
}