using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Application.Validators.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Validators;

public class UpdateExtraCurricularRequestValidatorTests
{
	private readonly UpdateExtraCurricularRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "278UC3")]
	public void Validate_EmptyDescriptionOrNoPhase_ReturnsFailureAgainstThatMember()
	{
		var empty = _validator.Validate(new UpdateExtraCurricularRequest("", PhaseType.Junior));
		var whitespace = _validator.Validate(new UpdateExtraCurricularRequest("   ", PhaseType.Junior));
		var noPhase = _validator.Validate(new UpdateExtraCurricularRequest("Marimba Band", null));

		ShouldlyHelpers.Satisfy(
			() => empty.IsValid.ShouldBeFalse(),
			() => empty.Errors.ShouldContain(e => e.PropertyName == nameof(UpdateExtraCurricularRequest.Description)),
			// Whitespace is not a description either — the refusal is of the value,
			// not merely of the empty string.
			() => whitespace.IsValid.ShouldBeFalse(),
			() => noPhase.IsValid.ShouldBeFalse(),
			() => noPhase.Errors.ShouldContain(e => e.PropertyName == nameof(UpdateExtraCurricularRequest.Phase)));
	}

	[Fact]
	[Trait("AC", "278UC3")]
	public void Validate_DescriptionAndPhase_ReturnsSuccess()
	{
		var result = _validator.Validate(new UpdateExtraCurricularRequest("Marimba Ensemble", PhaseType.Senior));

		result.IsValid.ShouldBeTrue();
	}
}