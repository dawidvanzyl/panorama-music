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
}
