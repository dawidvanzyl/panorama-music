using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Requests.WaitingList;

/// <summary>
/// The Waiting List tab's own fields. The occurrence, lesson and duration types
/// travel as the identifier of the seeded structure that combines them, which
/// is also what makes an unoffered combination unrepresentable rather than
/// merely rejected.
/// <para>
/// It carries no added date-time. That is the queue's ordering key, so a
/// request that could name one could move a row up the list; there is no field
/// here to supply, and a body carrying one is ignored on binding.
/// </para>
/// <para>
/// The two identifiers are nullable so an omitted value is distinguishable
/// from a valid one and can be rejected by the validator, the same reasoning
/// <see cref="CaptureWaitingListStudentRequest"/> follows.
/// </para>
/// </summary>
public sealed record UpdateWaitingListEntryRequest(
	Guid? LessonStructureId,
	InstrumentType? InstrumentType,
	string? Notes);
