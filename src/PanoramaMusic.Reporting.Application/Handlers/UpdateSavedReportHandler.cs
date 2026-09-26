using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Application.Services;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Messages;

namespace PanoramaMusic.Reporting.Application.Handlers;

public sealed class UpdateSavedReportHandler(
	ReportDefinitionFactory definitionFactory,
	ISavedReportRepository repository,
	IUserContext userContext)
{
	public async Task<SavedReportResult> HandleAsync(Guid savedReportId, SaveReportRequest request, CancellationToken cancellationToken)
	{
		var userId = userContext.UserId ?? throw new InvalidOperationException("An authenticated user is required to update a report.");

		var record = await repository.GetByIdAsync(savedReportId, cancellationToken)
			?? throw new EntityNotFoundException(SavedReportMessages.NotFound);

		record.Report.EnsureCreatedBy(userId);

		var definition = await definitionFactory.CreateAsync(
			request.Definition.ToFilterInputs(), [.. request.Definition.Columns], cancellationToken);

		record.Report.Update(userId, request.Name, definition);

		await repository.UpdateAsync(record.Report, cancellationToken);

		return record.ToResult(userId);
	}
}