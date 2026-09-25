using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Messages;

namespace PanoramaMusic.Reporting.Application.Handlers;

public sealed class RunSavedReportHandler(
	ReportDefinitionFactory definitionFactory,
	ISavedReportRepository repository,
	ReportRunner runner,
	IUserContext userContext,
	TimeProvider timeProvider)
{
	public async Task<SavedReportRunResult> HandleAsync(Guid savedReportId, CancellationToken cancellationToken)
	{
		var record = await repository.GetByIdAsync(savedReportId, cancellationToken)
			?? throw new EntityNotFoundException(SavedReportMessages.NotFound);

		var definition = await definitionFactory.CreateAsync(
			record.Report.Definition.Filters, record.Report.Definition.Columns, cancellationToken);

		var layout = await runner.RunAsync(definition, cancellationToken);

		var ranAt = timeProvider.GetUtcNow();
		record.Report.RecordRun(ranAt.UtcDateTime);
		await repository.UpdateLastRunAsync(record.Report, cancellationToken);

		return new SavedReportRunResult(
			record.Report.SavedReportId,
			record.Report.Name,
			record.CreatorEmail ?? SavedReportMessages.RemovedCreator,
			record.Report.CreatedBy == userContext.UserId,
			ranAt,
			layout.Sections.Count,
			[.. layout.Columns.Select(column => new ReportRunColumnResult(column.Key, column.Header))],
			[.. layout.Sections.Select(section => new ReportRunSectionResult(section.StudentId, section.Rows))]);
	}
}
