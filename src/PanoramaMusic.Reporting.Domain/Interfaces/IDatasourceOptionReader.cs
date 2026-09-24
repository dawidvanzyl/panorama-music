using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Interfaces;

/// <summary>Reads one datasource's live options, for listing and for validating a submitted value.</summary>
public interface IDatasourceOptionReader
{
	Task<IReadOnlyList<FieldOption>> ReadAsync(ReportDatasource datasource, CancellationToken cancellationToken);
}