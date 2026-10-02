using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Interfaces;

/// <summary>
/// Reads the enrolled Student population a report definition's filters match,
/// each carrying the raw source values of the selected Student-collection
/// columns. Ordered by the fixed Student ordering (317UC13) — there is no
/// user-controlled sort.
/// </summary>
public interface IPopulationReader
{
	Task<IReadOnlyList<PopulationMember>> ReadAsync(ReportDefinition definition, CancellationToken cancellationToken);
}