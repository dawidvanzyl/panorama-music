using PanoramaMusic.Students.Application.Requests.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Validators.StudentExtraCurriculars;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Validators;

public class AssignExtraCurricularRequestValidatorTests
{
	private readonly AssignExtraCurricularRequestValidator _validator = new();

	[Fact]
	public void Validate_ActivityNotChosen_IsRefusedInTheStorysOwnWordingForBothShapes()
	{
		// Absent, and the empty Guid: the two shapes an unchosen activity arrives
		// in. A message attached to only the second leaves the first refused in
		// FluentValidation's default wording, which is what this pins.
		var absent = _validator.Validate(new AssignExtraCurricularRequest(null));
		var empty = _validator.Validate(new AssignExtraCurricularRequest(Guid.Empty));

		ShouldlyHelpers.Satisfy(
			() => absent.IsValid.ShouldBeFalse(),
			() => absent.Errors.Select(error => error.ErrorMessage).ShouldBe(["Choose an activity."]),
			() => empty.IsValid.ShouldBeFalse(),
			() => empty.Errors.Select(error => error.ErrorMessage).ShouldBe(["Choose an activity."]));
	}

	[Fact]
	public void Validate_ActivityChosen_IsAccepted()
	{
		var result = _validator.Validate(new AssignExtraCurricularRequest(Guid.NewGuid()));

		result.IsValid.ShouldBeTrue();
	}
}