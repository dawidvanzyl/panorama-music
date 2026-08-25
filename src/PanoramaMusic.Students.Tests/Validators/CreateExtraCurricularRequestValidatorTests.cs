using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Application.Validators.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Validators;

public class CreateExtraCurricularRequestValidatorTests
{
	private readonly CreateExtraCurricularRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "275UC3")]
	public void Validate_NoPracticeTimes_ReturnsFailureStatingAtLeastOneIsRequired()
	{
		var empty = _validator.Validate(RequestWith([]));
		var missing = _validator.Validate(new CreateExtraCurricularRequest("Marimba Band", PhaseType.Junior, null));

		ShouldlyHelpers.Satisfy(
			() => empty.IsValid.ShouldBeFalse(),
			() => empty.Errors.ShouldContain(e =>
				e.ErrorMessage == "An activity must have at least one practice time."),
			// An omitted collection is refused for the same reason an empty one is.
			() => missing.IsValid.ShouldBeFalse(),
			() => missing.Errors.ShouldContain(e =>
				e.PropertyName == nameof(CreateExtraCurricularRequest.PracticeTimes)));
	}

	[Fact]
	[Trait("AC", "275UC4")]
	public void Validate_TwoSlotsSharingADayAndStartTime_ReturnsFailureNamingThatSlot()
	{
		var result = _validator.Validate(RequestWith([
			(DayOfWeek.Monday, new TimeOnly(15, 0)),
			(DayOfWeek.Wednesday, new TimeOnly(15, 0)),
			(DayOfWeek.Monday, new TimeOnly(15, 0))]));

		ShouldlyHelpers.Satisfy(
			() => result.IsValid.ShouldBeFalse(),
			// The message names the refused slot: a request carrying several is
			// otherwise ambiguous about which one was rejected.
			() => result.Errors.ShouldContain(e =>
				e.ErrorMessage == "Monday 15:00 is already a practice time for this activity."));
	}

	[Fact]
	[Trait("AC", "275UC4")]
	public void Validate_SameDayAtDifferentStartTimes_ReturnsSuccess()
	{
		// The rule is one slot per day-and-time pair, not one slot per day.
		var result = _validator.Validate(RequestWith([
			(DayOfWeek.Monday, new TimeOnly(15, 0)),
			(DayOfWeek.Monday, new TimeOnly(16, 0))]));

		result.IsValid.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "275UC3")]
	public void Validate_MissingDescriptionOrPhase_ReturnsFailureNamingIt()
	{
		var noDescription = _validator.Validate(
			new CreateExtraCurricularRequest("  ", PhaseType.Junior, SlotsFor([(DayOfWeek.Monday, new TimeOnly(15, 0))])));
		var noPhase = _validator.Validate(
			new CreateExtraCurricularRequest("Marimba Band", null, SlotsFor([(DayOfWeek.Monday, new TimeOnly(15, 0))])));

		ShouldlyHelpers.Satisfy(
			() => noDescription.IsValid.ShouldBeFalse(),
			() => noDescription.Errors.ShouldContain(e =>
				e.PropertyName == nameof(CreateExtraCurricularRequest.Description)),
			() => noPhase.IsValid.ShouldBeFalse(),
			() => noPhase.Errors.ShouldContain(e => e.PropertyName == nameof(CreateExtraCurricularRequest.Phase)));
	}

	[Fact]
	[Trait("AC", "275UC1")]
	public void Validate_CompleteRequest_ReturnsSuccess()
	{
		var result = _validator.Validate(RequestWith([(DayOfWeek.Monday, new TimeOnly(15, 0))]));

		result.IsValid.ShouldBeTrue();
	}

	private static CreateExtraCurricularRequest RequestWith((DayOfWeek Day, TimeOnly StartTime)[] slots) =>
		new("Marimba Band", PhaseType.Junior, SlotsFor(slots));

	private static IList<PracticeTimeRequest> SlotsFor((DayOfWeek Day, TimeOnly StartTime)[] slots) =>
		[.. slots.Select(slot => new PracticeTimeRequest(slot.Day, slot.StartTime))];
}