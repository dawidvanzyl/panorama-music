using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Handlers;

/// <summary>
/// Reads only the datasources the request's filters actually reference, then
/// builds the <see cref="ReportDefinition"/> — which throws before any
/// population reader is touched when the definition is invalid — then runs
/// it and maps the result. <see cref="TimeProvider"/> is injected rather than
/// read from <see cref="DateTimeOffset.UtcNow"/> directly, so a test can fix
/// <c>ranAt</c> to a known value.
/// </summary>
public sealed class RunReportHandler(
	StudentFieldRegistry registry,
	IDatasourceOptionReader datasourceOptionReader,
	ReportRunner runner,
	TimeProvider timeProvider)
{
	public async Task<ReportRunResult> HandleAsync(RunReportRequest request, CancellationToken cancellationToken)
	{
		var referencedDatasources = request.Filters
			.Select(filter => registry.TryGetFilter(filter.Field)?.Datasource)
			.OfType<ReportDatasource>()
			.Distinct()
			.ToList();

		var datasourceOptions = new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();
		foreach (var datasource in referencedDatasources)
		{
			datasourceOptions[datasource] = await datasourceOptionReader.ReadAsync(datasource, cancellationToken);
		}

		var definition = ReportDefinition.Create(request.ToFilterInputs(), [.. request.Columns], registry, datasourceOptions);

		var layout = await runner.RunAsync(definition, cancellationToken);

		return layout.ToResult(timeProvider.GetUtcNow());
	}
}