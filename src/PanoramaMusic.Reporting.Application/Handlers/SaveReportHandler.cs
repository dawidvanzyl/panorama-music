using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.Interfaces;

namespace PanoramaMusic.Reporting.Application.Handlers;

public sealed class SaveReportHandler(
	ReportDefinitionFactory definitionFactory,
	ISavedReportRepository repository,
	IUserContext userContext,
	TimeProvider timeProvider)
{
	public async Task<SavedReportResult> HandleAsync(SaveReportRequest request, CancellationToken cancellationToken)
	{
		var userId = userContext.UserId ?? throw new InvalidOperationException("An authenticated user is required to save a report.");

		var definition = await definitionFactory.CreateAsync(
			request.Definition.ToFilterInputs(), [.. request.Definition.Columns], cancellationToken);

		var report = SavedReport.Create(Guid.NewGuid(), request.Name, definition, userId, timeProvider.GetUtcNow().UtcDateTime);

		await repository.CreateAsync(report, cancellationToken);

		var record = await repository.GetByIdAsync(report.SavedReportId, cancellationToken);

		return record!.ToResult(userId);
	}
}
