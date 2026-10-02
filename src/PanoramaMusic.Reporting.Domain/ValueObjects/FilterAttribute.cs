using PanoramaMusic.Reporting.Domain.Enums;

namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// A field a report can filter on, as the registry declares it. No SQL lives
/// here — see the Infrastructure catalog for the fragment each (key, operator)
/// pair resolves to.
/// </summary>
public sealed class FilterAttribute
{
	public FilterAttribute(
		string key,
		string label,
		ReportCollection collection,
		FieldDataType dataType,
		IReadOnlyList<FilterOperator> operators,
		IReadOnlyList<FieldOption> options,
		ReportDatasource? datasource = null)
	{
		Key = key;
		Label = label;
		Collection = collection;
		DataType = dataType;
		Operators = operators;
		Options = options;
		Datasource = datasource;
	}

	public string Key { get; }

	public string Label { get; }

	public ReportCollection Collection { get; }

	public FieldDataType DataType { get; }

	public IReadOnlyList<FilterOperator> Operators { get; }

	/// <summary>Empty for a text or datasource attribute; populated for list and boolean attributes.</summary>
	public IReadOnlyList<FieldOption> Options { get; }

	/// <summary>Non-null exactly when <see cref="DataType"/> is <see cref="FieldDataType.Datasource"/>.</summary>
	public ReportDatasource? Datasource { get; }

	public bool AllowsOperator(FilterOperator op) => Operators.Contains(op);

	public bool IsValidOptionValue(string value) => Options.Any(option => option.Value == value);
}