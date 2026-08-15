using FluentValidation;
using PanoramaMusic.Students.Application.Requests.Courses;

namespace PanoramaMusic.Students.Application.Validators.Courses;

public sealed class CreateCourseRequestValidator : AbstractValidator<CreateCourseRequest>
{
	public CreateCourseRequestValidator()
	{
		RuleFor(x => x.CourseType)
			.NotNull()
			.IsInEnum();

		RuleFor(x => x.LessonStructureId)
			.NotNull()
			.NotEqual(Guid.Empty);

		RuleFor(x => x.Cost)
			.NotNull()
			.GreaterThanOrEqualTo(0)
			.PrecisionScale(CourseValidationRules.CostPrecision, CourseValidationRules.CostScale, ignoreTrailingZeros: false);
	}
}
