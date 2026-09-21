using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.Registries;

namespace PanoramaMusic.Reporting.Application.Handlers;

public sealed class GetReportFieldsHandler(StudentFieldRegistry registry)
{
	public Task<ReportFieldsResult> HandleAsync(CancellationToken cancellationToken) =>
		Task.FromResult(registry.ToResult());
}
