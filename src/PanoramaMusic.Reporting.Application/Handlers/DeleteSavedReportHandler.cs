using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Messages;

namespace PanoramaMusic.Reporting.Application.Handlers;

public sealed class DeleteSavedReportHandler(ISavedReportRepository repository, IUserContext userContext)
{
	public async Task HandleAsync(Guid savedReportId, CancellationToken cancellationToken)
	{
		var userId = userContext.UserId ?? throw new InvalidOperationException("An authenticated user is required to delete a report.");

		var record = await repository.GetByIdAsync(savedReportId, cancellationToken)
			?? throw new EntityNotFoundException(SavedReportMessages.NotFound);

		record.Report.Delete(userId);

		await repository.DeleteAsync(record.Report, cancellationToken);
	}
}