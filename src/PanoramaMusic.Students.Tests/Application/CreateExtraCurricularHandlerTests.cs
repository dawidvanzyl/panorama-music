using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class CreateExtraCurricularHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly CreateExtraCurricularHandler _handler;

	public CreateExtraCurricularHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<CreateExtraCurricularHandler>();
	}

	[Fact]
	[Trait("AC", "275UC1")]
	public async Task HandleAsync_DescriptionPhaseAndOneSlot_PersistsTheActivityWithItAndReturnsIt()
	{
		var persisted = CaptureCreated();

		var result = await _handler.HandleAsync(
			CommandFor("Marimba Band", PhaseType.Junior, (DayOfWeek.Monday, new TimeOnly(15, 0))),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Description.ShouldBe("Marimba Band"),
			() => result.Phase.ShouldBe(PhaseType.Junior),
			() => result.PracticeTimes.Count.ShouldBe(1),
			() => result.PracticeTimes[0].Day.ShouldBe(DayOfWeek.Monday),
			() => result.PracticeTimes[0].StartTime.ShouldBe(new TimeOnly(15, 0)),
			// The slot was persisted against the activity, not merely returned.
			() => persisted.Activity.ShouldNotBeNull(),
			() => persisted.Activity!.ExtraCurricularId.ShouldBe(result.ExtraCurricularId),
			() => persisted.PracticeTimes.Count.ShouldBe(1),
			() => persisted.PracticeTimes[0].ExtraCurricularId.ShouldBe(result.ExtraCurricularId),
			() => persisted.PracticeTimes[0].Day.ShouldBe(DayOfWeek.Monday));
	}

	[Fact]
	[Trait("AC", "275UC2")]
	public async Task HandleAsync_SeveralSlots_PersistsEveryOneOfThemAgainstThatActivity()
	{
		var persisted = CaptureCreated();

		var result = await _handler.HandleAsync(
			CommandFor(
				"Choir",
				PhaseType.Senior,
				(DayOfWeek.Friday, new TimeOnly(14, 0)),
				(DayOfWeek.Monday, new TimeOnly(16, 0)),
				(DayOfWeek.Monday, new TimeOnly(9, 15))),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => persisted.Activity.ShouldNotBeNull(),
			// One write per slot, sequenced by the handler on the request's
			// ambient transaction — not folded into the activity's own write.
			() => persisted.PracticeTimes.Count.ShouldBe(3),
			// All three belong to the one activity — not only the last surviving.
			() => persisted.PracticeTimes.ShouldAllBe(slot => slot.ExtraCurricularId == result.ExtraCurricularId),
			() => persisted.PracticeTimes.Select(slot => slot.ToString())
				.ShouldBe(["Monday 09:15", "Monday 16:00", "Friday 14:00"]),
			() => result.PracticeTimes.Count.ShouldBe(3),
			// Each slot is identified in its own right, so a caller can address one.
			() => result.PracticeTimes.Select(slot => slot.PracticeTimeId).Distinct().Count().ShouldBe(3));
	}

	[Fact]
	[Trait("AC", "278UC25")]
	public async Task HandleAsync_DescriptionAlreadyHeldInThatPhase_ThrowsDomainExceptionAndPersistsNothing()
	{
		var persisted = CaptureCreated();
		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.ExistsInPhaseAsync("Choir", PhaseType.Junior, null, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var exception = await Should.ThrowAsync<DomainException>(async () => await _handler.HandleAsync(
			CommandFor("Choir", PhaseType.Junior, (DayOfWeek.Monday, new TimeOnly(15, 0))),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			// Names what collided, in the phase it collided in.
			() => exception.Message.ShouldBe("Junior already has an activity called \"Choir\"."),
			() => persisted.Activity.ShouldBeNull(),
			() => persisted.PracticeTimes.ShouldBeEmpty());
	}

	[Fact]
	[Trait("AC", "278UC26")]
	public async Task HandleAsync_SameDescriptionInTheOtherPhase_IsCreated()
	{
		var persisted = CaptureCreated();
		// The Junior catalogue holds it; the Senior one does not, and the read is
		// asked about the phase being created into.
		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.ExistsInPhaseAsync("Choir", PhaseType.Junior, null, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var result = await _handler.HandleAsync(
			CommandFor("Choir", PhaseType.Senior, (DayOfWeek.Monday, new TimeOnly(15, 0))),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Description.ShouldBe("Choir"),
			() => result.Phase.ShouldBe(PhaseType.Senior),
			// A Junior Choir and a Senior Choir are legitimately different
			// activities, so the second really was written.
			() => persisted.Activity.ShouldNotBeNull());
	}

	private static CreateExtraCurricularCommand CommandFor(
		string description,
		PhaseType phase,
		params (DayOfWeek Day, TimeOnly StartTime)[] slots) =>
		new(new CreateExtraCurricularRequest(
			description,
			phase,
			[.. slots.Select(slot => new PracticeTimeRequest(slot.Day, slot.StartTime))]));

	/// <summary>
	/// What the handler asked the repository to persist: the activity, and each
	/// slot it wrote afterwards in the order it wrote them.
	/// </summary>
	private CapturedWrites CaptureCreated()
	{
		var captured = new CapturedWrites();

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<ExtraCurricular>(), It.IsAny<CancellationToken>()))
			.Callback<ExtraCurricular, CancellationToken>((extraCurricular, _) => captured.Activity = extraCurricular)
			.Returns(Task.CompletedTask);

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.CreatePracticeTimeAsync(It.IsAny<ExtraCurricular>(), It.IsAny<ExtraCurricularPracticeTime>(), It.IsAny<CancellationToken>()))
			.Callback<ExtraCurricular, ExtraCurricularPracticeTime, CancellationToken>((_, practiceTime, _) =>
			{
				// The activity has to exist before a slot can reference it, so the
				// order the handler writes in is part of what is being asserted.
				captured.Activity.ShouldNotBeNull();
				captured.PracticeTimes.Add(practiceTime);
			})
			.Returns(Task.CompletedTask);

		return captured;
	}

	private sealed class CapturedWrites
	{
		public ExtraCurricular? Activity { get; set; }

		public List<ExtraCurricularPracticeTime> PracticeTimes { get; } = [];
	}
}