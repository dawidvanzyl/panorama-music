using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// One occurrence type's slice of the waiting list — During School or After
/// School — with the entries waiting under it, in queue order. A group with no
/// waiting entries is omitted entirely rather than returned empty, which is why
/// this list carries only the occurrence types that actually have one.
/// </summary>
public sealed record WaitingListGroupResult(
	OccurrenceType OccurrenceType,
	int Count,
	IList<WaitingListEntryResult> Entries);