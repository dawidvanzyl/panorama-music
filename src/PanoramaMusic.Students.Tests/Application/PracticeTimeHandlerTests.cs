using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

/// <summary>
/// Maintaining the practice times of an activity that already exists. Both rules
/// are about the slots the activity already holds, so each test starts from a
/// stored slot set and asserts what the use case did — or refused to do — with it.
/// </summary>
public class PracticeTimeHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly AddPracticeTimeHandler _addHandler;
	private readonly RemovePracticeTimeHandler _removeHandler;

	public PracticeTimeHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_addHandler = _context.ServiceProvider.GetRequiredService<AddPracticeTimeHandler>();
		_removeHandler = _context.ServiceProvider.GetRequiredService<RemovePracticeTimeHandler>();
	}

	[Fact]
	[Trait("AC", "276UC1")]
	public async Task HandleAsync_DayAndStartTimeTheActivityDoesNotHold_PersistsTheSlotAndLeavesTheOthers()
	{
		var activity = GivenActivity((DayOfWeek.Friday, new TimeOnly(14, 0)));
		var writes = CaptureWrites();

		var result = await _addHandler.HandleAsync(
			new AddPracticeTimeCommand(activity.ExtraCurricularId, new PracticeTimeRequest(DayOfWeek.Monday, new TimeOnly(9, 15))),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Day.ShouldBe(DayOfWeek.Monday),
			() => result.StartTime.ShouldBe(new TimeOnly(9, 15)),
			// Persisted against that activity, and only the new slot was written —
			// the ones it already held were not rewritten.
			() => writes.Added.Count.ShouldBe(1),
			() => writes.Added[0].PracticeTimeId.ShouldBe(result.PracticeTimeId),
			() => writes.Added[0].ExtraCurricularId.ShouldBe(activity.ExtraCurricularId),
			() => writes.Deleted.ShouldBeEmpty(),
			// The existing slot is untouched, and the aggregate still reads in
			// day-then-time order with the new slot in its place.
			() => activity.PracticeTimes.Select(slot => slot.ToString())
				.ShouldBe(["Monday 09:15", "Friday 14:00"]));
	}

	[Fact]
	[Trait("AC", "276UC2")]
	public async Task HandleAsync_DayAndStartTimeTheActivityAlreadyHolds_IsRejectedNamingItAndPersistsNothing()
	{
		var activity = GivenActivity((DayOfWeek.Monday, new TimeOnly(15, 0)));
		var writes = CaptureWrites();

		var thrown = await Should.ThrowAsync<DomainException>(() => _addHandler.HandleAsync(
			new AddPracticeTimeCommand(activity.ExtraCurricularId, new PracticeTimeRequest(DayOfWeek.Monday, new TimeOnly(15, 0))),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			// The message names the slot it is about, verbatim as the panel shows it.
			() => thrown.Message.ShouldBe("Monday 15:00 is already a practice time for this activity."),
			() => writes.Added.ShouldBeEmpty(),
			() => activity.PracticeTimes.Count.ShouldBe(1));
	}

	[Fact]
	[Trait("AC", "276UC4")]
	public async Task HandleAsync_OneOfSeveralSlots_DeletesOnlyThatSlotAndLeavesTheRestUnchanged()
	{
		var activity = GivenActivity(
			(DayOfWeek.Monday, new TimeOnly(15, 0)),
			(DayOfWeek.Tuesday, new TimeOnly(15, 0)),
			(DayOfWeek.Thursday, new TimeOnly(15, 0)));
		var writes = CaptureWrites();
		// The middle one: removing by position rather than by identity takes out a
		// neighbour, which targeting the first or the last would hide.
		var target = activity.PracticeTimes.Single(slot => slot.Day == DayOfWeek.Tuesday);

		await _removeHandler.HandleAsync(
			new RemovePracticeTimeCommand(activity.ExtraCurricularId, target.PracticeTimeId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => writes.Deleted.Count.ShouldBe(1),
			() => writes.Deleted[0].PracticeTimeId.ShouldBe(target.PracticeTimeId),
			() => writes.Deleted[0].ExtraCurricularId.ShouldBe(activity.ExtraCurricularId),
			() => activity.PracticeTimes.Select(slot => slot.ToString())
				.ShouldBe(["Monday 15:00", "Thursday 15:00"]));
	}

	[Fact]
	[Trait("AC", "276UC5")]
	public async Task HandleAsync_TheActivitysOnlyRemainingSlot_IsRefusedAndTheSlotStays()
	{
		var activity = GivenActivity((DayOfWeek.Thursday, new TimeOnly(11, 0)));
		var writes = CaptureWrites();
		var only = activity.PracticeTimes.Single();

		var thrown = await Should.ThrowAsync<DomainException>(() => _removeHandler.HandleAsync(
			new RemovePracticeTimeCommand(activity.ExtraCurricularId, only.PracticeTimeId),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => thrown.Message.ShouldBe("An activity must have at least one practice time."),
			() => writes.Deleted.ShouldBeEmpty(),
			() => activity.PracticeTimes.Single().PracticeTimeId.ShouldBe(only.PracticeTimeId));
	}

	[Fact]
	[Trait("AC", "276UC6")]
	public async Task HandleAsync_UnknownActivityOrSlot_IsReportedAsNotFoundAndChangesNothing()
	{
		var activity = GivenActivity((DayOfWeek.Monday, new TimeOnly(10, 0)), (DayOfWeek.Monday, new TimeOnly(11, 0)));
		var writes = CaptureWrites();
		var unknown = Guid.NewGuid();

		var addToUnknownActivity = await Should.ThrowAsync<EntityNotFoundException>(() => _addHandler.HandleAsync(
			new AddPracticeTimeCommand(unknown, new PracticeTimeRequest(DayOfWeek.Friday, new TimeOnly(12, 0))),
			TestContext.Current.CancellationToken));
		var removeFromUnknownActivity = await Should.ThrowAsync<EntityNotFoundException>(() => _removeHandler.HandleAsync(
			new RemovePracticeTimeCommand(unknown, Guid.NewGuid()),
			TestContext.Current.CancellationToken));
		// A real activity asked for a slot it does not own — the guard that a
		// non-existent activity identifier never reaches.
		var removeUnknownSlot = await Should.ThrowAsync<EntityNotFoundException>(() => _removeHandler.HandleAsync(
			new RemovePracticeTimeCommand(activity.ExtraCurricularId, unknown),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => addToUnknownActivity.Message.ShouldContain(unknown.ToString()),
			() => removeFromUnknownActivity.Message.ShouldContain(unknown.ToString()),
			() => removeUnknownSlot.Message.ShouldContain(unknown.ToString()),
			// Nothing was written on any of the three, and the real activity kept
			// both of its slots rather than the refusal cascading.
			() => writes.Added.ShouldBeEmpty(),
			() => writes.Deleted.ShouldBeEmpty(),
			() => activity.PracticeTimes.Count.ShouldBe(2));
	}

	/// <summary>
	/// An activity the repository will hand back for its own identifier, and for
	/// no other — so a test can ask for one that does not exist without arranging
	/// anything further.
	/// </summary>
	private ExtraCurricular GivenActivity(params (DayOfWeek Day, TimeOnly StartTime)[] slots)
	{
		var activity = ExtraCurricularFactory.Create(slots: slots);

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.GetByIdAsync(activity.ExtraCurricularId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(activity);

		return activity;
	}

	/// <summary>What the handler asked the repository to write.</summary>
	private CapturedWrites CaptureWrites()
	{
		var captured = new CapturedWrites();

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.CreatePracticeTimeAsync(It.IsAny<ExtraCurricular>(), It.IsAny<ExtraCurricularPracticeTime>(), It.IsAny<CancellationToken>()))
			.Callback<ExtraCurricular, ExtraCurricularPracticeTime, CancellationToken>((_, practiceTime, _) => captured.Added.Add(practiceTime))
			.Returns(Task.CompletedTask);

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.DeletePracticeTimeAsync(It.IsAny<ExtraCurricular>(), It.IsAny<ExtraCurricularPracticeTime>(), It.IsAny<CancellationToken>()))
			.Callback<ExtraCurricular, ExtraCurricularPracticeTime, CancellationToken>((_, practiceTime, _) => captured.Deleted.Add(practiceTime))
			.Returns(Task.CompletedTask);

		return captured;
	}

	private sealed class CapturedWrites
	{
		public List<ExtraCurricularPracticeTime> Added { get; } = [];

		public List<ExtraCurricularPracticeTime> Deleted { get; } = [];
	}
}