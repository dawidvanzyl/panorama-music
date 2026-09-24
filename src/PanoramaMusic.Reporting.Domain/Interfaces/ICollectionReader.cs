using PanoramaMusic.Reporting.Domain.Enums;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Interfaces;

/// <summary>
/// Reads one non-Student collection's records for a whole population in a
/// single set-based query (never one query per student — N+1 is a defect).
/// No implementation is registered while the registry declares no
/// non-Student collection; a Guardian, Course or ExtraCurricular reader
/// implements this without changing the contract or <c>ReportRunner</c>.
/// </summary>
public interface ICollectionReader
{
	ReportCollection Collection { get; }

	Task<IReadOnlyList<CollectionRecord>> ReadAsync(
		IReadOnlyCollection<Guid> studentIds,
		IReadOnlyList<ColumnAttribute> columns,
		CancellationToken cancellationToken);
}