using PanoramaMusic.Reporting.Domain.Extensions;

namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// A validated <see cref="ReportDefinition"/> reduced to the raw, wire-form
/// inputs a saved report stores: filters with their operator names, and
/// column keys in the definition's own display order. Re-validated against
/// the registry on every run through <c>ReportDefinition.Create</c> — this
/// type carries no behaviour of its own.
/// </summary>
public sealed record StoredReportDefinition(
	IReadOnlyList<ReportFilterInput> Filters,
	IReadOnlyList<string> Columns)
{
	public static StoredReportDefinition From(ReportDefinition definition) => new(
		[.. definition.Filters.Select(filter => new ReportFilterInput(filter.Field, filter.Operator.ToOperatorName(), filter.Values))],
		[.. definition.Columns.Select(column => column.Key)]);
}