namespace PanoramaMusic.Students.Domain.Messages;

/// <summary>
/// Why a waiting-list operation was refused.
/// </summary>
public static class WaitingListMessages
{
	public const string OccurrenceTypeIsFixed =
		"A student enrolled off the waiting list keeps the occurrence type they waited under, so the chosen lesson structure must carry it.";

	public const string LessonStructureIsNotOffered =
		"The school runs no instrument course for that lesson type and duration, so a student cannot be made to wait for it.";

	public const string NoInstrumentCourseForStructure =
		"No instrument course is offered for that lesson type and duration, so this student cannot be enrolled under it.";
}