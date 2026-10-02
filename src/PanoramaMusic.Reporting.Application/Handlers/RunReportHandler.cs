using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;

namespace PanoramaMusic.Reporting.Application.Handlers;

/// <summary>
/// Builds the definition through <see cref="ReportDefinitionFactory"/> — which
/// throws before any population reader is touched when the definition is
/// invalid — then runs it and maps the result. <see cref="TimeProvider"/> is
/// injected rather than read from <see cref="DateTimeOffset.UtcNow"/> directly,
/// so a test can fix <c>ranAt</c> to a known value.
/// </summary>
public sealed class RunReportHandler(
	ReportDefinitionFactory definitionFactory,
	ReportRunner runner,
	TimeProvider timeProvider)
{
	public async Task<ReportRunResult> HandleAsync(RunReportRequest request, CancellationToken cancellationToken)
	{
		var definition = await definitionFactory.CreateAsync(request.ToFilterInputs(), [.. request.Columns], cancellationToken);

		var layout = await runner.RunAsync(definition, cancellationToken);

		return layout.ToResult(timeProvider.GetUtcNow());
	}
}