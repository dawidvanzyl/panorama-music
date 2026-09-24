using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Messages;
using PanoramaMusic.Reporting.Domain.Registries;

namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// A validated, ready-to-run report: an ordered list of filters and a column
/// set normalised to collection then registry display order. There is no way to construct one
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

	/// <summary>Always ordered by collection (Student, Guardian, Course, ExtraCurricular), then display order within it.</summary>
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
		StudentFieldRegistry registry,
		IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> datasourceOptions)
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

			var validatedValues = ValidateValues(attribute, op.Value, filter, datasourceOptions);

			validatedFilters.Add(new ReportFilter(filter.Field, op.Value, validatedValues));
		}

		// Checked on the raw request before any key is resolved: a column list
		// this long already violates "at most ten columns" regardless of
		// whether every key turns out to be valid, so there is no reason to
		// resolve any of them first.
		if (columnKeys.Count > _maxColumns)
			throw new InvalidReportDefinitionException(ReportDefinitionMessages.TooManyColumns);

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

		foreach (var column in validatedColumns)
		{
			if (column.DependsOn is not null && !seenColumns.Contains(column.DependsOn))
				throw new InvalidReportDefinitionException(ReportDefinitionMessages.MissingAnchor(column.Key, column.DependsOn));
		}

		var ordered = validatedColumns
			.OrderBy(column => CollectionRank(column.Collection))
			.ThenBy(column => column.DisplayOrder)
			.ToList();

		return new ReportDefinition(validatedFilters, ordered);
	}

	private static int CollectionRank(ReportCollection collection) => collection switch
	{
		ReportCollection.Student => 0,
		ReportCollection.Guardian => 1,
		ReportCollection.Course => 2,
		ReportCollection.ExtraCurricular => 3,
		_ => 4,
	};

	private static FilterOperator? ParseOperator(string operatorName) => operatorName switch
	{
		"equals" => FilterOperator.Equals,
		"contains" => FilterOperator.Contains,
		"in" => FilterOperator.In,
		_ => null,
	};

	private static IReadOnlyList<string> ValidateValues(
		FilterAttribute attribute,
		FilterOperator op,
		ReportFilterInput filter,
		IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> datasourceOptions)
	{
		var nonBlankValues = filter.Values.Where(value => !string.IsNullOrWhiteSpace(value)).ToList();
		if (nonBlankValues.Count == 0)
			throw new InvalidReportDefinitionException(ReportDefinitionMessages.MissingValue(filter.Field));

		// Only `in` ever carries more than one value: no builder control for
		// `equals` or `contains` can produce several substrings, so more than
		// one value under either is rejected here, the same as an unknown
		// value would be.
		if (op is FilterOperator.Equals or FilterOperator.Contains && nonBlankValues.Count > 1)
		{
			throw new InvalidReportDefinitionException(
				ReportDefinitionMessages.SingleValueOnly(filter.Field, filter.Operator));
		}

		if (attribute.DataType is FieldDataType.Datasource)
			return [.. nonBlankValues.Select(value => ValidateDatasourceValue(attribute, filter, datasourceOptions, value))];

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

		return nonBlankValues;
	}

	/// <summary>
	/// A datasource value is valid only when it parses as a <see cref="Guid"/>
	/// and equals, as a Guid, some option value read live for the attribute's
	/// datasource. A missing dictionary entry means no value is valid. The
	/// validated value is normalised to the option's own canonical string.
	/// </summary>
	private static string ValidateDatasourceValue(
		FilterAttribute attribute,
		ReportFilterInput filter,
		IReadOnlyDictionary<ReportDatasource, IReadOnlyList<FieldOption>> datasourceOptions,
		string value)
	{
		if (!Guid.TryParse(value, out var parsed))
			throw new InvalidReportDefinitionException(ReportDefinitionMessages.InvalidValue(filter.Field, value));

		if (attribute.Datasource is null || !datasourceOptions.TryGetValue(attribute.Datasource.Value, out var options))
			throw new InvalidReportDefinitionException(ReportDefinitionMessages.InvalidValue(filter.Field, value));

		var match = options.FirstOrDefault(option => Guid.TryParse(option.Value, out var optionGuid) && optionGuid == parsed) ?? throw new InvalidReportDefinitionException(ReportDefinitionMessages.InvalidValue(filter.Field, value));
		return match.Value;
	}
}