namespace PanoramaMusic.Teachers.Application.Models;

/// <summary>
/// One row of the banking activity view. <paramref name="EventType"/> is the
/// audit event type rather than a sentence — naming the action for a reader is
/// presentation, and the API has no business holding display text.
/// </summary>
public sealed record BankingActivityEntryResult(
	DateTime OccurredAt,
	string EventType,
	string? ActorEmail,
	string? AccountNumberLast4);