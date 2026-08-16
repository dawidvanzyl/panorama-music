using FluentValidation;
using PanoramaMusic.Students.Application.Requests.Courses;

namespace PanoramaMusic.Students.Application.Validators.Courses;

public sealed class UpdateCourseRequestValidator : AbstractValidator<UpdateCourseRequest>
{
	public UpdateCourseRequestValidator()
	{
		RuleFor(x => x.Cost)
			.NotNull()
			.GreaterThanOrEqualTo(0)
			.PrecisionScale(CourseValidationRules.CostPrecision, CourseValidationRules.CostScale, ignoreTrailingZeros: false);
	}
}