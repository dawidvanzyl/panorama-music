using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Application.Validators.Courses;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Validators;

public class CreateCourseRequestValidatorTests
{
	private readonly CreateCourseRequestValidator _validator = new();

	[Fact]
	[Trait("AC", "257UC3")]
	public void Validate_MissingCourseType_ReturnsFailureNamingCourseType()
	{
		var result = _validator.Validate(new CreateCourseRequest(null, 120.00m, Guid.NewGuid()));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CreateCourseRequest.CourseType)));
	}

	[Fact]
	[Trait("AC", "257UC3")]
	public void Validate_MissingLessonStructure_ReturnsFailureNamingLessonStructureId()
	{
		var result = _validator.Validate(new CreateCourseRequest(CourseType.Theory, 120.00m, null));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CreateCourseRequest.LessonStructureId)));
	}

	[Fact]
	[Trait("AC", "257UC3")]
	public void Validate_NegativeCost_ReturnsFailureNamingCost()
	{
		var result = _validator.Validate(new CreateCourseRequest(CourseType.Theory, -1.00m, Guid.NewGuid()));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CreateCourseRequest.Cost)));
	}

	[Fact]
	[Trait("AC", "257UC3")]
	public void Validate_CostWithMoreThanTwoDecimalPlaces_ReturnsFailureNamingCost()
	{
		var result = _validator.Validate(new CreateCourseRequest(CourseType.Theory, 120.005m, Guid.NewGuid()));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CreateCourseRequest.Cost)));
	}

	[Fact]
	[Trait("AC", "257UC3")]
	public void Validate_MissingCost_ReturnsFailureNamingCost()
	{
		var result = _validator.Validate(new CreateCourseRequest(CourseType.Theory, null, Guid.NewGuid()));

		result.ShouldSatisfyAllConditions(
			result => result.IsValid.ShouldBeFalse(),
			result => result.Errors.ShouldContain(e => e.PropertyName == nameof(CreateCourseRequest.Cost)));
	}

	[Fact]
	[Trait("AC", "257UC3")]
	public void Validate_CompleteRequest_ReturnsSuccess()
	{
		var result = _validator.Validate(new CreateCourseRequest(CourseType.Instrument, 450.50m, Guid.NewGuid()));

		result.IsValid.ShouldBeTrue();
	}
}
