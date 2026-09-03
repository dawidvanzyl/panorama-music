using PanoramaMusic.Domain;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.WaitingList;

namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// A student's place on the waiting list: the student it belongs to, the lesson
/// structure they are waiting for, the instrument they intend to take up,
/// optional notes, and the date-time they were added. It holds the student and
/// lesson structure themselves rather than just their identifiers, so an entry
/// can only be built from records that were actually read back — the same
/// reasoning <see cref="Course"/> follows for its own lesson structure.
/// <para>
/// It names no course: which course a student ends up in is settled at
/// enrolment, a later story's concern. A student holds at most one entry — the
/// database's own unique constraint on student_id is what actually settles
/// that against a race, the same way <see cref="Course"/>'s duplicate
/// enrollment is settled — and the added date-time is set once, at creation,
/// and never changed afterwards.
/// </para>
/// </summary>
public sealed class WaitingListEntry : AggregateRoot
{
	public WaitingListEntry(
		Guid waitingListEntryId,
		Student student,
		LessonStructure lessonStructure,
		InstrumentType instrumentType,
		string? notes,
		DateTime addedAt)
	{
		WaitingListEntryId = waitingListEntryId;
		Student = student;
		LessonStructure = lessonStructure;
		InstrumentType = instrumentType;
		Notes = notes;
		AddedAt = addedAt;
	}

	/// <summary>
	/// Captures a student onto the waiting list. <paramref name="addedAt"/> is
	/// supplied by the caller rather than read from the clock here so a handler
	/// under test controls it directly — the API layer is what pins it to
	/// <see cref="DateTime.UtcNow"/>, never a client-supplied value.
	/// </summary>
	public static WaitingListEntry Create(
		Guid waitingListEntryId,
		Student student,
		LessonStructure lessonStructure,
		InstrumentType instrumentType,
		string? notes,
		DateTime addedAt)
	{
		var entry = new WaitingListEntry(waitingListEntryId, student, lessonStructure, instrumentType, notes, addedAt);

		entry.Raise(new WaitingListEntryCreated(entry));
		return entry;
	}

	public Guid WaitingListEntryId { get; }

	public Student Student { get; }

	public LessonStructure LessonStructure { get; }

	public InstrumentType InstrumentType { get; }

	public string? Notes { get; }

	/// <summary>
	/// When the student was added to the list. Set once, at creation, and never
	/// changed afterwards — the queue position derived from it stays correct
	/// without a reordering step.
	/// </summary>
	public DateTime AddedAt { get; }

	/// <summary>
	/// How an entry reads wherever one has to be named to a person — an audit
	/// event's target, a refusal message. The student and the structure they are
	/// waiting for, which is what the interface shows too.
	/// </summary>
	public override string ToString() => $"{Student} · {LessonStructure}";
}