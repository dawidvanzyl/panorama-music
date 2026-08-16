using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Application.Validators.Courses;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Validators;

public class UpdateCourseRequestValidatorTests
{
	private readonly UpdateCourseRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "258UC3")]
	public void Validate_NegativeCost_ReturnsFailureNamingCost()
	{
		var result = _validator.Validate(new UpdateCourseRequest(-1.00m));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(UpdateCourseRequest.Cost)));
	}

	[Fact]
	[Trait("AC", "258UC3")]
	public void Validate_CostWithMoreThanTwoDecimalPlaces_ReturnsFailureNamingCost()
	{
		var result = _validator.Validate(new UpdateCourseRequest(120.005m));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(UpdateCourseRequest.Cost)));
	}

	[Fact]
	[Trait("AC", "258UC3")]
	public void Validate_MissingCost_ReturnsFailureNamingCost()
	{
		var result = _validator.Validate(new UpdateCourseRequest(null));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(UpdateCourseRequest.Cost)));
	}

	[Fact]
	[Trait("AC", "258UC3")]
	public void Validate_CostWithTwoDecimalPlaces_ReturnsSuccess()
	{
		var result = _validator.Validate(new UpdateCourseRequest(499.99m));

		result.IsValid.ShouldBeTrue();
	}
}