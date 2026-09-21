using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Messages;
using PanoramaMusic.Reporting.Domain.Registries;

namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// A validated, ready-to-run report: an ordered list of filters and a column
/// set normalised to registry display order. There is no way to construct one
/// that names an unknown field, an operator its field's type does not allow,
/// or an invalid value — every business rule in the issue's "Domain & Data"
/// section is enforced in <see cref="Create"/>, before any reader is touched.
/// </summary>
public sealed class ReportDefinition
{
	private const int _maxColumns = 10;
	private const int _maxTextValueLength = 200;
	private const string _studentColumnKey = "student.name";

	private ReportDefinition(IReadOnlyList<ReportFilter> filters, IReadOnlyList<ColumnAttribute> columns)
	{
		Filters = filters;
		Columns = columns;
	}

	public IReadOnlyList<ReportFilter> Filters { get; }

	/// <summary>Always in registry display order, Student first, regardless of the request's order.</summary>
	public IReadOnlyList<ColumnAttribute> Columns { get; }

	/// <summary>The distinct collections the selected columns draw from, Student always first.</summary>
	public IReadOnlyList<ReportCollection> SelectedCollections =>
		[.. Columns
			.Select(column => column.Collection)
			.Distinct()
			.OrderBy(collection => collection == ReportCollection.Student ? 0 : 1)];

	public static ReportDefinition Create(
		IReadOnlyList<ReportFilterInput> filters,
		IReadOnlyList<string> columnKeys,
		StudentFieldRegistry registry)
	{
		var validatedFilters = new List<ReportFilter>(filters.Count);
		foreach (var filter in filters)
		{
			var attribute = registry.TryGetFilter(filter.Field)
				?? throw new InvalidReportDefinitionException(ReportDefinitionMessages.UnknownField(filter.Field));

			var op = ParseOperator(filter.Operator);
			if (op is null || !attribute.AllowsOperator(op.Value))
			{
				throw new InvalidReportDefinitionException(
					ReportDefinitionMessages.InvalidOperator(filter.Field, filter.Operator));
			}

			ValidateValues(attribute, op.Value, filter);

			validatedFilters.Add(new ReportFilter(filter.Field, op.Value, filter.Values));
		}

		var seenColumns = new HashSet<string>();
		var validatedColumns = new List<ColumnAttribute>(columnKeys.Count);
		foreach (var key in columnKeys)
		{
			var column = registry.TryGetColumn(key)
				?? throw new InvalidReportDefinitionException(ReportDefinitionMessages.UnknownColumn(key));

			if (!seenColumns.Add(key))
				throw new InvalidReportDefinitionException(ReportDefinitionMessages.DuplicateColumn(key));

			validatedColumns.Add(column);
		}

		if (!seenColumns.Contains(_studentColumnKey))
			throw new InvalidReportDefinitionException(ReportDefinitionMessages.StudentColumnRequired);

		if (validatedColumns.Count > _maxColumns)
			throw new InvalidReportDefinitionException(ReportDefinitionMessages.TooManyColumns);

		var ordered = validatedColumns.OrderBy(column => column.DisplayOrder).ToList();

		return new ReportDefinition(validatedFilters, ordered);
	}

	private static FilterOperator? ParseOperator(string operatorName) => operatorName switch
	{
		"equals" => FilterOperator.Equals,
		"contains" => FilterOperator.Contains,
		"in" => FilterOperator.In,
		_ => null,
	};

	private static void ValidateValues(FilterAttribute attribute, FilterOperator op, ReportFilterInput filter)
	{
		var nonBlankValues = filter.Values.Where(value => !string.IsNullOrWhiteSpace(value)).ToList();
		if (nonBlankValues.Count == 0)
			throw new InvalidReportDefinitionException(ReportDefinitionMessages.MissingValue(filter.Field));

		// Only `in` ever carries more than one value: `equals` and `contains`
		// (D10 — no UI control produces several substrings) are each rejected
		// otherwise, the same as an unknown value would be.
		if (op is FilterOperator.Equals or FilterOperator.Contains && nonBlankValues.Count > 1)
		{
			throw new InvalidReportDefinitionException(
				ReportDefinitionMessages.SingleValueOnly(filter.Field, filter.Operator));
		}

		foreach (var value in nonBlankValues)
		{
			if (attribute.DataType is FieldDataType.Text)
			{
				if (value.Length > _maxTextValueLength)
					throw new InvalidReportDefinitionException(ReportDefinitionMessages.ValueTooLong(filter.Field));

				continue;
			}

			// List and boolean attributes must match a registered option value.
			if (!attribute.IsValidOptionValue(value))
				throw new InvalidReportDefinitionException(ReportDefinitionMessages.InvalidValue(filter.Field, value));
		}
	}
}
