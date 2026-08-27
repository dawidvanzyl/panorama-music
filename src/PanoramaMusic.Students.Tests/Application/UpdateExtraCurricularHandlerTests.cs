using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class UpdateExtraCurricularHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UpdateExtraCurricularHandler _handler;

	public UpdateExtraCurricularHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateExtraCurricularHandler>();
	}

	[Fact]
	[Trait("AC", "278UC1")]
	public async Task HandleAsync_NewDescription_PersistsItAndLeavesThePracticeTimesUntouched()
	{
		var activity = GivenActivity(
			"Marimba Band",
			PhaseType.Junior,
			(DayOfWeek.Monday, new TimeOnly(15, 0)),
			(DayOfWeek.Thursday, new TimeOnly(15, 0)));
		var persisted = CaptureUpdated();

		var result = await _handler.HandleAsync(
			CommandFor(activity.ExtraCurricularId, "Marimba Ensemble", PhaseType.Junior),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Description.ShouldBe("Marimba Ensemble"),
			() => persisted.Activity.ShouldNotBeNull(),
			() => persisted.Activity!.Description.ShouldBe("Marimba Ensemble"),
			// The slot set is exactly what it was — an edit never reaches the
			// practice times, and there is no write that could have moved one.
			() => persisted.Activity!.PracticeTimes.Select(slot => slot.ToString())
				.ShouldBe(["Monday 15:00", "Thursday 15:00"]),
			() => result.PracticeTimes.Count.ShouldBe(2),
			() => _context.Repositories.ExtraCurricularRepositoryMock.Verify(
				r => r.CreatePracticeTimeAsync(It.IsAny<ExtraCurricular>(), It.IsAny<ExtraCurricularPracticeTime>(), It.IsAny<CancellationToken>()),
				Times.Never),
			() => _context.Repositories.ExtraCurricularRepositoryMock.Verify(
				r => r.DeletePracticeTimeAsync(It.IsAny<ExtraCurricular>(), It.IsAny<ExtraCurricularPracticeTime>(), It.IsAny<CancellationToken>()),
				Times.Never));
	}

	[Fact]
	[Trait("AC", "278UC2")]
	public async Task HandleAsync_NewPhase_PersistsItAndLeavesThePracticeTimesUntouched()
	{
		var activity = GivenActivity("Choir", PhaseType.Junior, (DayOfWeek.Monday, new TimeOnly(15, 0)));
		var persisted = CaptureUpdated();

		var result = await _handler.HandleAsync(
			CommandFor(activity.ExtraCurricularId, "Choir", PhaseType.Senior),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Phase.ShouldBe(PhaseType.Senior),
			() => persisted.Activity.ShouldNotBeNull(),
			() => persisted.Activity!.Phase.ShouldBe(PhaseType.Senior),
			// The description came along unchanged — moving an activity between
			// phases is not a rename.
			() => persisted.Activity!.Description.ShouldBe("Choir"),
			() => persisted.Activity!.PracticeTimes.Select(slot => slot.ToString()).ShouldBe(["Monday 15:00"]));
	}

	[Fact]
	[Trait("AC", "278UC7")]
	public async Task HandleAsync_UnknownActivity_ThrowsEntityNotFoundAndPersistsNothing()
	{
		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((ExtraCurricular?)null);

		await Should.ThrowAsync<EntityNotFoundException>(async () => await _handler.HandleAsync(
			CommandFor(Guid.NewGuid(), "Anything", PhaseType.Junior),
			TestContext.Current.CancellationToken));

		_context.Repositories.ExtraCurricularRepositoryMock.Verify(
			r => r.UpdateAsync(It.IsAny<ExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "278UC27")]
	public async Task HandleAsync_DescriptionAndPhaseHeldByAnotherActivity_ThrowsDomainExceptionAndPersistsNothing()
	{
		var activity = GivenActivity("Marimba Band", PhaseType.Junior);
		// Another activity in that phase already carries the description.
		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.ExistsInPhaseAsync("Choir", PhaseType.Junior, activity.ExtraCurricularId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		var exception = await Should.ThrowAsync<DomainException>(async () => await _handler.HandleAsync(
			CommandFor(activity.ExtraCurricularId, "Choir", PhaseType.Junior),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => exception.Message.ShouldBe("Junior already has an activity called \"Choir\"."),
			() => _context.Repositories.ExtraCurricularRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<ExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "278UC28")]
	public async Task HandleAsync_TheDescriptionAndPhaseItAlreadyHolds_IsPermitted()
	{
		var activity = GivenActivity("Choir", PhaseType.Junior);
		var persisted = CaptureUpdated();

		var result = await _handler.HandleAsync(
			CommandFor(activity.ExtraCurricularId, "Choir", PhaseType.Junior),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Description.ShouldBe("Choir"),
			() => persisted.Activity.ShouldNotBeNull(),
			// The read excludes the activity being edited, so it never collides
			// with itself — the exclusion is what makes this permitted.
			() => _context.Repositories.ExtraCurricularRepositoryMock.Verify(
				r => r.ExistsInPhaseAsync("Choir", PhaseType.Junior, activity.ExtraCurricularId, It.IsAny<CancellationToken>()),
				Times.Once));
	}

	private static UpdateExtraCurricularCommand CommandFor(Guid extraCurricularId, string description, PhaseType phase) =>
		new(extraCurricularId, new UpdateExtraCurricularRequest(description, phase));

	/// <summary>An activity the repository reads back, with the slots given.</summary>
	private ExtraCurricular GivenActivity(
		string description,
		PhaseType phase,
		params (DayOfWeek Day, TimeOnly StartTime)[] slots)
	{
		var activity = ExtraCurricularFactory.Create(Guid.NewGuid(), description, phase, slots);

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.GetByIdAsync(activity.ExtraCurricularId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(activity);

		return activity;
	}

	/// <summary>The activity the handler asked the repository to persist, once it did.</summary>
	private CapturedUpdate CaptureUpdated()
	{
		var captured = new CapturedUpdate();

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.UpdateAsync(It.IsAny<ExtraCurricular>(), It.IsAny<CancellationToken>()))
			.Callback<ExtraCurricular, CancellationToken>((extraCurricular, _) => captured.Activity = extraCurricular)
			.Returns(Task.CompletedTask);

		return captured;
	}

	private sealed class CapturedUpdate
	{
		public ExtraCurricular? Activity { get; set; }
	}
}
