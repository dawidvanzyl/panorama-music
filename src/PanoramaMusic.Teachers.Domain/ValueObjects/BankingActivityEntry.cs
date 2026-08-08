namespace PanoramaMusic.Teachers.Domain.ValueObjects;

/// <summary>
/// One recorded action against a teacher's banking details, in the shape the
/// banking activity view needs. Carries the last four digits and nothing more
/// of the account number — the audit trail it is read from holds no more than
/// that either.
/// </summary>
public sealed record BankingActivityEntry(
	DateTime OccurredAt,
	string EventType,
	string? ActorEmail,
	string? AccountNumberLast4);