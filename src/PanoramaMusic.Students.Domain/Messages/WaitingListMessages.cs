namespace PanoramaMusic.Students.Domain.Messages;

/// <summary>
/// Why a waiting-list operation was refused.
/// </summary>
public static class WaitingListMessages
{
	public const string OccurrenceTypeIsFixed =
		"A student enrolled off the waiting list keeps the occurrence type they waited under, so the chosen course must be offered under it.";
}
