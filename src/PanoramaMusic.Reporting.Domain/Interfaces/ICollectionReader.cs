using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Interfaces;

/// <summary>
/// Reads one non-Student collection's records for a whole population in a
/// single set-based query (never one query per student — N+1 is a defect),
/// admitting only records that satisfy every filter given.
/// </summary>
public interface ICollectionReader
{
	ReportCollection Collection { get; }

	Task<IReadOnlyList<CollectionRecord>> ReadAsync(
		IReadOnlyCollection<Guid> studentIds,
		IReadOnlyList<ColumnAttribute> columns,
		IReadOnlyList<ReportFilter> filters,
		CancellationToken cancellationToken);
}