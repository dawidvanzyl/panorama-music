using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.Exceptions;
using PanoramaMusic.Reporting.Domain.Interfaces;
using PanoramaMusic.Reporting.Domain.Messages;

namespace PanoramaMusic.Reporting.Application.Handlers;

public sealed class GetSavedReportHandler(ISavedReportRepository repository, IUserContext userContext)
{
	public async Task<SavedReportDetailResult> HandleAsync(Guid savedReportId, CancellationToken cancellationToken)
	{
		var record = await repository.GetByIdAsync(savedReportId, cancellationToken)
			?? throw new EntityNotFoundException(SavedReportMessages.NotFound);

		return record.ToDetailResult(userContext.UserId);
	}
}