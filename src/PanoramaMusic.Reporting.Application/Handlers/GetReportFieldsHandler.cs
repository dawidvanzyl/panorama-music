using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Handlers;

/// <summary>Reads each datasource's live options once and fills them onto the registry's datasource filters.</summary>
public sealed class GetReportFieldsHandler(StudentFieldRegistry registry, IDatasourceOptionReader datasourceOptionReader)
{
	private static readonly ReportDatasource[] _allDatasources =
		[ReportDatasource.GuardianRelationship, ReportDatasource.Teacher, ReportDatasource.ExtraCurricular];

	public async Task<ReportFieldsResult> HandleAsync(CancellationToken cancellationToken)
	{
		var datasourceOptions = new Dictionary<ReportDatasource, IReadOnlyList<FieldOption>>();
		foreach (var datasource in _allDatasources)
		{
			datasourceOptions[datasource] = await datasourceOptionReader.ReadAsync(datasource, cancellationToken);
		}

		return registry.ToResult(datasourceOptions);
	}
}