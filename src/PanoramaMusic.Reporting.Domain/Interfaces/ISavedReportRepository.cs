using PanoramaMusic.Reporting.Domain.Entities;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Interfaces;

public interface ISavedReportRepository
{
	Task CreateAsync(SavedReport report, CancellationToken cancellationToken);

	Task<IReadOnlyList<SavedReportRecord>> GetAllAsync(CancellationToken cancellationToken);

	Task<SavedReportRecord?> GetByIdAsync(Guid savedReportId, CancellationToken cancellationToken);

	Task UpdateLastRunAsync(SavedReport report, CancellationToken cancellationToken);
}
