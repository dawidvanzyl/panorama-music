using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetWaitingListHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetWaitingListHandler _handler;

	public GetWaitingListHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetWaitingListHandler>();
	}

	[Fact]
	[Trait("AC", "292UC1")]
	public async Task HandleAsync_EntriesUnderBothOccurrenceTypes_ReturnsGroupsInDuringThenAfterOrder()
	{
		var duringSchool = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		var afterSchool = LessonStructureFactory.Create(occurrenceType: OccurrenceType.AfterSchool);
		var duringEntry = WaitingListEntryFactory.Create(lessonStructure: duringSchool, addedAt: AddedAt(1));
		var afterEntry = WaitingListEntryFactory.Create(lessonStructure: afterSchool, addedAt: AddedAt(2));
		SetupEntries(afterEntry, duringEntry);

		var results = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => results.Count.ShouldBe(2),
			// During School leads, independent of the order the repository returned
			// them in.
			() => results[0].OccurrenceType.ShouldBe(OccurrenceType.DuringSchool),
			() => results[1].OccurrenceType.ShouldBe(OccurrenceType.AfterSchool),
			() => results[0].Entries.Single().WaitingListEntryId.ShouldBe(duringEntry.WaitingListEntryId),
			() => results[1].Entries.Single().WaitingListEntryId.ShouldBe(afterEntry.WaitingListEntryId));
	}

	[Fact]
	[Trait("AC", "292UC2")]
	public async Task HandleAsync_EntriesUnderOneOccurrenceType_EachCarriesItsDerivedOneBasedPosition()
	{
		var lessonStructure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		var first = WaitingListEntryFactory.Create(lessonStructure: lessonStructure, addedAt: AddedAt(1));
		var second = WaitingListEntryFactory.Create(lessonStructure: lessonStructure, addedAt: AddedAt(2));
		var third = WaitingListEntryFactory.Create(lessonStructure: lessonStructure, addedAt: AddedAt(3));
		// Seeded out of addedAt order, so position could not pass by coincidence
		// of the list order the repository happened to return.
		SetupEntries(third, first, second);

		var results = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		var group = results.Single();
		ShouldlyHelpers.Satisfy(
			() => group.Count.ShouldBe(3),
			() => group.Entries.Select(e => e.WaitingListEntryId)
				.ShouldBe([first.WaitingListEntryId, second.WaitingListEntryId, third.WaitingListEntryId]),
			() => group.Entries.Select(e => e.Position).ShouldBe([1, 2, 3]));
	}

	[Fact]
	[Trait("AC", "292UC3")]
	public async Task HandleAsync_TwoEntriesAddedOnTheSameDate_OrderIsDecidedByTheFullDateTime()
	{
		var lessonStructure = LessonStructureFactory.Create(occurrenceType: OccurrenceType.DuringSchool);
		var sameDayEarlier = WaitingListEntryFactory.Create(
			lessonStructure: lessonStructure,
			addedAt: new DateTime(2026, 3, 10, 8, 0, 0, DateTimeKind.Utc));
		var sameDayLater = WaitingListEntryFactory.Create(
			lessonStructure: lessonStructure,
			addedAt: new DateTime(2026, 3, 10, 17, 45, 0, DateTimeKind.Utc));
		// Seeded with the later time-of-day first, so a comparison that dropped
		// the time component and fell back to insertion order would still pass —
		// only comparing the full date-time gets the order below.
		SetupEntries(sameDayLater, sameDayEarlier);

		var results = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		results.Single().Entries.Select(e => e.WaitingListEntryId)
			.ShouldBe([sameDayEarlier.WaitingListEntryId, sameDayLater.WaitingListEntryId]);
	}

	[Fact]
	[Trait("AC", "292UC4")]
	public async Task HandleAsync_AnEntry_CarriesTheStructureItIsWaitingForAndNoCourseType()
	{
		var lessonStructure = LessonStructureFactory.Create(
			lessonType: LessonType.Group,
			durationType: DurationType.Hour,
			occurrenceType: OccurrenceType.AfterSchool);
		var entry = WaitingListEntryFactory.Create(
			lessonStructure: lessonStructure,
			instrumentType: InstrumentType.Guitar);
		SetupEntries(entry);

		var results = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		var row = results.Single().Entries.Single();
		ShouldlyHelpers.Satisfy(
			() => row.LessonType.ShouldBe(LessonType.Group),
			() => row.DurationType.ShouldBe(DurationType.Hour),
			() => row.InstrumentType.ShouldBe(InstrumentType.Guitar));
		// WaitingListEntryResult carries no course or course-type member at all —
		// the type itself is the proof that nothing here can leak one.
	}

	private static DateTime AddedAt(int day) => new(2026, 1, day, 0, 0, 0, DateTimeKind.Utc);

	private void SetupEntries(params WaitingListEntry[] entries) =>
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync(entries);
}