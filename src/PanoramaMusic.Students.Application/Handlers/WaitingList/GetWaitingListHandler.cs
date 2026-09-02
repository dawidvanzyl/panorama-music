using PanoramaMusic.Students.Application.Extensions;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Interfaces;

namespace PanoramaMusic.Students.Application.Handlers.WaitingList;

public sealed class GetWaitingListHandler(IWaitingListRepository waitingListRepository)
{
	/// <summary>
	/// During School before After School — the fixed order the screen shows the
	/// two lists in, independent of how the read returned them.
	/// </summary>
	private static readonly OccurrenceType[] _occurrenceOrder = [OccurrenceType.DuringSchool, OccurrenceType.AfterSchool];

	/// <summary>
	/// The waiting list grouped by occurrence type and ordered by date-time added
	/// within each group, each entry carrying its derived one-based queue
	/// position. An occurrence type with no waiting entries is omitted entirely —
	/// this list is never returned holding an empty group.
	/// </summary>
	public async Task<IList<WaitingListGroupResult>> HandleAsync(CancellationToken cancellationToken)
	{
		var entries = await waitingListRepository.GetAllAsync(cancellationToken);

		return [.. _occurrenceOrder
			.Select(occurrenceType => BuildGroup(occurrenceType, entries))
			.Where(group => group.Count > 0)];
	}

	private static WaitingListGroupResult BuildGroup(OccurrenceType occurrenceType, IList<WaitingListEntry> entries)
	{
		// Ordered by the full date-time added, never by insertion order or the
		// date alone — two entries added on the same day still order
		// deterministically this way.
		var ordered = entries
			.Where(entry => entry.LessonStructure.OccurrenceType == occurrenceType)
			.OrderBy(entry => entry.AddedAt)
			.ToList();

		var rows = ordered.Select((entry, index) => entry.ToResult(index + 1)).ToList();

		return new WaitingListGroupResult(occurrenceType, rows.Count, rows);
	}
}