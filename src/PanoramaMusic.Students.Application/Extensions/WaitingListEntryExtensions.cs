using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Application.Extensions;

public static class WaitingListEntryExtensions
{
	/// <summary>
	/// The entry as the wire shape, carrying the queue <paramref name="position"/>
	/// the caller derived for it — the entry itself holds no position, since one
	/// is never correct outside the group and order it was derived within.
	/// </summary>
	public static WaitingListEntryResult ToResult(this WaitingListEntry entry, int position) =>
		new(
			entry.WaitingListEntryId,
			entry.Student.StudentId,
			entry.Student.FirstName,
			entry.Student.LastName,
			position,
			entry.LessonStructure.LessonType,
			entry.LessonStructure.DurationType,
			entry.InstrumentType,
			entry.Notes,
			entry.AddedAt);

	/// <summary>
	/// The entry's one-based position within its own occurrence type's group,
	/// ordered by date-time added — the same derivation
	/// <c>GetWaitingListHandler</c> applies across the whole list, run here
	/// against one entry so a write path can answer with the position its
	/// result will hold on the next read.
	/// <para>
	/// Because it is derived rather than stored, an entry moved to the other
	/// occurrence type takes its standing there from its original added
	/// date-time and does not join the back of that list.
	/// </para>
	/// </summary>
	public static int DerivePosition(this WaitingListEntry entry, IEnumerable<WaitingListEntry> entries)
	{
		var index = entries
			.Where(e => e.LessonStructure.OccurrenceType == entry.LessonStructure.OccurrenceType)
			.OrderBy(e => e.AddedAt)
			.ToList()
			.FindIndex(e => e.WaitingListEntryId == entry.WaitingListEntryId);

		return index + 1;
	}
}