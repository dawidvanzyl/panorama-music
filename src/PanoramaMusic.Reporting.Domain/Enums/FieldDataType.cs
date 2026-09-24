namespace PanoramaMusic.Reporting.Domain.Enums;

/// <summary>
/// The shape of a filter attribute's value, which decides which operators and
/// value controls it offers. <c>Datasource</c> is reserved for a future
/// attribute whose options come from another table rather than a fixed list;
/// no currently-registered attribute uses it.
/// </summary>
public enum FieldDataType
{
	Text,
	List,
	Boolean,
	Datasource,
}