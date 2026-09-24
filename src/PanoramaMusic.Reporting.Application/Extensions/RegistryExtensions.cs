using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.Registries;

namespace PanoramaMusic.Reporting.Application.Extensions;

/// <summary>Maps the Domain registry to the API contract the builder consumes.</summary>
public static class RegistryExtensions
{
	public static ReportFieldsResult ToResult(this StudentFieldRegistry registry) => new(
		[.. registry.Filters.Select(filter => new ReportFilterFieldResult(
			filter.Key,
			filter.Collection.ToString(),
			filter.Label,
			filter.DataType.ToString(),
			[.. filter.Operators.Select(op => op.ToString().ToLowerInvariant())],
			[.. filter.Options.Select(option => new ReportFieldOptionResult(option.Value, option.Label))]))],
		[.. registry.Columns.Select(column => new ReportColumnFieldResult(
			column.Key,
			column.Collection.ToString(),
			column.Header,
			column.DisplayOrder,
			column.DependsOn,
			column.Locked))]);
}