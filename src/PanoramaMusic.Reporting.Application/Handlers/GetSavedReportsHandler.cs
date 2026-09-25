using PanoramaMusic.Reporting.Application.Extensions;
using PanoramaMusic.Reporting.Application.Interfaces;
using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.Interfaces;

namespace PanoramaMusic.Reporting.Application.Handlers;

public sealed class GetSavedReportsHandler(ISavedReportRepository repository, IUserContext userContext)
{
	public async Task<IReadOnlyList<SavedReportSummaryResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var records = await repository.GetAllAsync(cancellationToken);

		return [.. records.Select(record => record.ToSummaryResult(userContext.UserId))];
	}
}