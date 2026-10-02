namespace PanoramaMusic.Reporting.Domain.Enums;

/// <summary>
/// The shape of a filter attribute's value, which decides which operators and
/// value controls it offers. <c>Datasource</c> is for an attribute whose
/// options come from another table rather than a fixed list.
/// </summary>
public enum FieldDataType
{
	Text,
	List,
	Boolean,
	Datasource,
}