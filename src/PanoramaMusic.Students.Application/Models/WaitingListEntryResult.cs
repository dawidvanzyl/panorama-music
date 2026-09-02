using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Models;

/// <summary>
/// One row of a waiting-list occurrence group. Position is derived — the row's
/// one-based index within its occurrence type's group, ordered by
/// <see cref="AddedAt"/> — and never persisted. The enum members are the keys
/// that cross the wire; the display text a human reads is the consuming
/// screen's concern.
/// </summary>
public sealed record WaitingListEntryResult(
	Guid WaitingListEntryId,
	Guid StudentId,
	string FirstName,
	string LastName,
	int Position,
	LessonType LessonType,
	DurationType DurationType,
	InstrumentType InstrumentType,
	string? Notes,
	DateTime AddedAt);
