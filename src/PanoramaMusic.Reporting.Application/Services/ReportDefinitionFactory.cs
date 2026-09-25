using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Services;

/// <summary>
/// Reads only the datasources a set of filters actually reference, then
/// builds a validated <see cref="ReportDefinition"/> — the one place both a
/// fresh run and a saved report's re-run construct a definition, so a field
/// or datasource option withdrawn from the registry is refused identically
/// either way.
/// </summary>
public sealed class ReportDefinitionFactory(
	StudentFieldRegistry registry,
	IDatasourceOptionReader datasourceOptionReader)
{
	public async Task<ReportDefinition> CreateAsync(
		IReadOnlyList<ReportFilterInput> filters,
		IReadOnlyList<string> columns,
		CancellationToken cancellationToken)
	{
		var referencedDatasources = filters
			.Select(filter => registry.TryGetFilter(filter.Field)?.Datasource)
			.OfType<ReportDatasource>()
			.Distinct()
			.ToList();

		var datasourceOptions = new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();
		foreach (var datasource in referencedDatasources)
		{
			datasourceOptions[datasource] = await datasourceOptionReader.ReadAsync(datasource, cancellationToken);
		}

		return ReportDefinition.Create(filters, columns, registry, datasourceOptions);
	}
}
