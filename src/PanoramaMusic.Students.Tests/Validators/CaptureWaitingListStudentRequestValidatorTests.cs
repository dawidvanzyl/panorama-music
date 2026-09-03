using PanoramaMusic.Students.Application.Requests.WaitingList;
using PanoramaMusic.Students.Application.Validators.WaitingList;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Validators;

public class CaptureWaitingListStudentRequestValidatorTests
{
	private readonly CaptureWaitingListStudentRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "293UC4")]
	public void Validate_MissingLessonStructureId_ReturnsFailureNamingLessonStructureId()
	{
		var result = _validator.Validate(ValidRequest() with { LessonStructureId = null });

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CaptureWaitingListStudentRequest.LessonStructureId)));
	}

	[Fact]
	[Trait("AC", "293UC4")]
	public void Validate_MissingInstrumentType_ReturnsFailureNamingInstrumentType()
	{
		var result = _validator.Validate(ValidRequest() with { InstrumentType = null });

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CaptureWaitingListStudentRequest.InstrumentType)));
	}

	[Fact]
	[Trait("AC", "293UC7")]
	public void Validate_MissingFirstName_ReturnsFailureNamingFirstName()
	{
		var result = _validator.Validate(ValidRequest() with { FirstName = "" });

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CaptureWaitingListStudentRequest.FirstName)));
	}

	[Fact]
	[Trait("AC", "293UC7")]
	public void Validate_FutureDateOfBirth_ReturnsFailureNamingDateOfBirth()
	{
		var result = _validator.Validate(ValidRequest() with { DateOfBirth = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)) });

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CaptureWaitingListStudentRequest.DateOfBirth)));
	}

	[Fact]
	// No dedicated backend UC covers this — 293UC20 tests the frontend's own
	// input constraint. This is defense-in-depth for the same Functional
	// Requirement ("Notes must be limited to a stated maximum length"),
	// verified server-side too since the boundary is where it is actually
	// enforced.
	public void Validate_NotesOverTheStatedMaximumLength_ReturnsFailureNamingNotes()
	{
		var result = _validator.Validate(ValidRequest() with { Notes = new string('a', WaitingListValidationRules.NotesMaxLength + 1) });

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CaptureWaitingListStudentRequest.Notes)));
	}

	[Fact]
	[Trait("AC", "293UC5")]
	public void Validate_CompleteRequestWithNoNotes_ReturnsSuccess()
	{
		var result = _validator.Validate(ValidRequest());

		result.IsValid.ShouldBeTrue();
	}

	private static CaptureWaitingListStudentRequest ValidRequest() =>
		new(
			"Amara",
			"Pillay",
			new DateOnly(2016, 2, 14),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English,
			Guid.NewGuid(),
			InstrumentType.Piano,
			null);
}