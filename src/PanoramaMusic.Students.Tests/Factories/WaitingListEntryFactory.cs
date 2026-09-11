using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Tests.Factories;

public static class WaitingListEntryFactory
{
	public static WaitingListEntry Create(
		Guid? waitingListEntryId = null,
		Student? student = null,
		LessonStructure? lessonStructure = null,
		InstrumentType instrumentType = InstrumentType.Piano,
		string? notes = null,
		DateTime? addedAt = null) =>
		new(
			waitingListEntryId ?? Guid.NewGuid(),
			student ?? StudentFactory.Create(),
			lessonStructure ?? LessonStructureFactory.Create(),
			instrumentType,
			notes,
			addedAt ?? new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
}