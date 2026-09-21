using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Registries;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Handlers;

/// <summary>
/// Builds the <see cref="ReportDefinition"/> first — which throws before any
/// reader is touched when the definition is invalid — then runs it and maps
/// the result. <see cref="TimeProvider"/> is injected so <c>ranAt</c> is
/// testable (D8).
/// </summary>
public sealed class RunReportHandler(
	StudentFieldRegistry registry,
	ReportRunner runner,
	TimeProvider timeProvider)
{
	public async Task<ReportRunResult> HandleAsync(RunReportRequest request, CancellationToken cancellationToken)
	{
		var definition = ReportDefinition.Create(request.ToFilterInputs(), [.. request.Columns], registry);

		var layout = await runner.RunAsync(definition, cancellationToken);

		return layout.ToResult(timeProvider.GetUtcNow());
	}
}