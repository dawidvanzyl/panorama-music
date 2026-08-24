using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetExtraCurricularsHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetExtraCurricularsHandler _handler;

	public GetExtraCurricularsHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetExtraCurricularsHandler>();
	}

	[Fact]
	[Trait("AC", "275UC5")]
	public async Task HandleAsync_ReturnsEachActivityWithItsSlotsInDayThenStartTimeOrder()
	{
		// Stored in an order no part of the read is allowed to preserve: a later
		// weekday first, and the two Monday slots with the later one leading.
		var marimba = ExtraCurricularFactory.Create(
			description: "Marimba Band",
			slots: [
				(DayType.Friday, new TimeOnly(14, 0)),
				(DayType.Monday, new TimeOnly(16, 0)),
				(DayType.Monday, new TimeOnly(9, 15))]);
		var choir = ExtraCurricularFactory.Create(
			description: "Choir",
			slots: [(DayType.Sunday, new TimeOnly(8, 0)), (DayType.Tuesday, new TimeOnly(14, 30))]);
		SetupActivities(null, marimba, choir);

		var results = await _handler.HandleAsync(null, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => results.Count.ShouldBe(2),
			() => results[0].PracticeTimes.Select(slot => $"{slot.Day} {slot.StartTime:HH\\:mm}")
				.ShouldBe(["Monday 09:15", "Monday 16:00", "Friday 14:00"]),
			// Monday leads even against a slot earlier in the week's calendar
			// sense only if the week is read as starting on Monday.
			() => results[1].PracticeTimes.Select(slot => $"{slot.Day} {slot.StartTime:HH\\:mm}")
				.ShouldBe(["Tuesday 14:30", "Sunday 08:00"]));
	}

	[Fact]
	[Trait("AC", "275UC6")]
	public async Task HandleAsync_SinglePhase_ReturnsOnlyActivitiesOfThatPhase()
	{
		var seniorBand = ExtraCurricularFactory.Create(description: "Senior Band", phase: PhaseType.Senior);
		var juniorChoir = ExtraCurricularFactory.Create(description: "Junior Choir", phase: PhaseType.Junior);
		SetupActivities(null, seniorBand, juniorChoir);
		SetupActivities(PhaseType.Senior, seniorBand);

		var senior = await _handler.HandleAsync(PhaseType.Senior, TestContext.Current.CancellationToken);
		var all = await _handler.HandleAsync(null, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => senior.Count.ShouldBe(1),
			() => senior[0].Description.ShouldBe("Senior Band"),
			() => senior[0].Phase.ShouldBe(PhaseType.Senior),
			// The phase is carried to the read rather than applied after it, so a
			// caller asking for one phase never pays for the whole catalogue.
			() => _context.Repositories.ExtraCurricularRepositoryMock.Verify(
				r => r.GetAllAsync(PhaseType.Senior, It.IsAny<CancellationToken>()), Times.Once),
			// And an unfiltered read still returns everything.
			() => all.Count.ShouldBe(2));
	}

	private void SetupActivities(PhaseType? phase, params ExtraCurricular[] extraCurriculars)
	{
		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.GetAllAsync(phase, It.IsAny<CancellationToken>()))
			.ReturnsAsync(extraCurriculars);
	}
}