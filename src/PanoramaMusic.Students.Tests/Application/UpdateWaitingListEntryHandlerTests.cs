using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Requests.WaitingList;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class UpdateWaitingListEntryHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UpdateWaitingListEntryHandler _handler;

	public UpdateWaitingListEntryHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateWaitingListEntryHandler>();
	}

	[Fact]
	[Trait("AC", "294UC2")]
	public async Task HandleAsync_ChangedStructureInstrumentAndNotes_TheEntryRecordsTheNewValues()
	{
		var entry = WaitingListEntryFactory.Create(
			lessonStructure: LessonStructureFactory.Create(
				lessonType: LessonType.Individual,
				durationType: DurationType.Hour,
				occurrenceType: OccurrenceType.DuringSchool),
			instrumentType: InstrumentType.Piano,
			notes: "Prefers mornings");
		SetupEntry(entry);

		var newStructure = LessonStructureFactory.Create(
			lessonType: LessonType.Group,
			durationType: DurationType.HalfHour,
			occurrenceType: OccurrenceType.AfterSchool);
		SetupLessonStructure(newStructure);

		WaitingListEntry? persisted = null;
		CaptureUpdate(entry => persisted = entry);

		var result = await _handler.HandleAsync(
			new UpdateWaitingListEntryCommand(
				entry.WaitingListEntryId,
				new UpdateWaitingListEntryRequest(newStructure.LessonStructureId, InstrumentType.Guitar, "Afternoons only")),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => persisted.ShouldNotBeNull(),
			() => persisted!.LessonStructure.LessonType.ShouldBe(LessonType.Group),
			() => persisted!.LessonStructure.DurationType.ShouldBe(DurationType.HalfHour),
			() => persisted!.LessonStructure.OccurrenceType.ShouldBe(OccurrenceType.AfterSchool),
			() => persisted!.InstrumentType.ShouldBe(InstrumentType.Guitar),
			() => persisted!.Notes.ShouldBe("Afternoons only"),
			() => result.LessonType.ShouldBe(LessonType.Group),
			() => result.DurationType.ShouldBe(DurationType.HalfHour),
			() => result.InstrumentType.ShouldBe(InstrumentType.Guitar),
			() => result.Notes.ShouldBe("Afternoons only"));
	}

	[Fact]
	[Trait("AC", "294UC3")]
	public async Task HandleAsync_ARequestCarryingADifferentAddedAt_LeavesTheStoredAddedAtUnchanged()
	{
		var seededAddedAt = new DateTime(2026, 3, 9, 8, 15, 0, DateTimeKind.Utc);
		var entry = WaitingListEntryFactory.Create(addedAt: seededAddedAt);
		SetupEntry(entry);

		var newStructure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.AfterSchool);
		SetupLessonStructure(newStructure);

		WaitingListEntry? persisted = null;
		CaptureUpdate(entry => persisted = entry);

		// UpdateWaitingListEntryRequest carries no added-date member at all, so
		// there is nothing on it a caller could supply. What this proves is the
		// other half: the update path itself does not disturb the stored value
		// while writing everything around it.
		var result = await _handler.HandleAsync(
			new UpdateWaitingListEntryCommand(
				entry.WaitingListEntryId,
				new UpdateWaitingListEntryRequest(newStructure.LessonStructureId, InstrumentType.Voice, "Moved lists")),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => persisted!.AddedAt.ShouldBe(seededAddedAt),
			() => result.AddedAt.ShouldBe(seededAddedAt));
	}

	[Fact]
	[Trait("AC", "294UC4")]
	public async Task HandleAsync_ACombinationThatIsNotASeededLessonStructure_IsRejectedAndNothingIsWritten()
	{
		var entry = WaitingListEntryFactory.Create();
		SetupEntry(entry);

		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((LessonStructure?)null);

		await Should.ThrowAsync<DomainException>(() =>
			_handler.HandleAsync(
				new UpdateWaitingListEntryCommand(
					entry.WaitingListEntryId,
					new UpdateWaitingListEntryRequest(Guid.NewGuid(), InstrumentType.Piano, null)),
				TestContext.Current.CancellationToken));

		_context.Repositories.WaitingListRepositoryMock.Verify(
			r => r.UpdateAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "294UC5")]
	public async Task HandleAsync_AnEntryMovedToTheOtherOccurrenceType_TakesItsPositionThereFromItsOriginalAddedAt()
	{
		// The moved entry was added between the two students already waiting
		// After School, so a position derived from its original added date-time
		// puts it second — a move that sent it to the back would report third.
		var afterSchool = LessonStructureFactory.Create(occurrenceType: OccurrenceType.AfterSchool);
		var moved = WaitingListEntryFactory.Create(
			lessonStructure: LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool),
			addedAt: new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc));
		var earlier = WaitingListEntryFactory.Create(
			lessonStructure: afterSchool,
			addedAt: new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
		var later = WaitingListEntryFactory.Create(
			lessonStructure: afterSchool,
			addedAt: new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc));

		SetupEntry(moved);
		SetupLessonStructure(afterSchool);
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([earlier, moved, later]);

		var result = await _handler.HandleAsync(
			new UpdateWaitingListEntryCommand(
				moved.WaitingListEntryId,
				new UpdateWaitingListEntryRequest(afterSchool.LessonStructureId, InstrumentType.Piano, null)),
			TestContext.Current.CancellationToken);

		result.Position.ShouldBe(2);
	}

	private void SetupEntry(WaitingListEntry entry)
	{
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetByIdAsync(entry.WaitingListEntryId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(entry);
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([entry]);
	}

	private void SetupLessonStructure(LessonStructure lessonStructure) =>
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(lessonStructure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(lessonStructure);

	/// <summary>Hands back the entry as it was actually given to the repository to write.</summary>
	private void CaptureUpdate(Action<WaitingListEntry> onWrite) =>
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.UpdateAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()))
			.Callback<WaitingListEntry, CancellationToken>((entry, _) => onWrite(entry))
			.Returns(Task.CompletedTask);
}
