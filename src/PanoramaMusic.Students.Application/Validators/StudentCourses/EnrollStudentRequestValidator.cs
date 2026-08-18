using FluentValidation;
using PanoramaMusic.Students.Application.Requests.StudentCourses;

namespace PanoramaMusic.Students.Application.Validators.StudentCourses;

/// <summary>
/// Checks only what is true of every enrollment. Whether an instrument type and
/// a step belong on this particular request depends on the chosen course's type,
/// which is a rule of the domain rather than of the request shape — so it is
/// enforced by <c>StudentCourse.Enroll</c>, not here.
/// </summary>
public sealed class EnrollStudentRequestValidator : AbstractValidator<EnrollStudentRequest>
{
	public EnrollStudentRequestValidator()
	{
		RuleFor(x => x.CourseId)
			.NotNull()
			.NotEqual(Guid.Empty);

		RuleFor(x => x.TeacherId)
			.NotNull()
			.NotEqual(Guid.Empty);

		RuleFor(x => x.InstrumentType)
			.IsInEnum()
			.When(x => x.InstrumentType is not null);

		RuleFor(x => x.StepType)
			.IsInEnum()
			.When(x => x.StepType is not null);

		RuleFor(x => x.EnrolledDate)
			.NotNull();
	}
}