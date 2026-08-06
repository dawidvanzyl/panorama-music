using FluentValidation;
using PanoramaMusic.Teachers.Application.Requests.Teachers;

namespace PanoramaMusic.Teachers.Application.Validators.Teachers;

public sealed class UpdateTeacherProfileRequestValidator : AbstractValidator<UpdateTeacherProfileRequest>
{
	public UpdateTeacherProfileRequestValidator()
	{
		RuleFor(x => x.FirstName)
			.NotEmpty();

		RuleFor(x => x.Surname)
			.NotEmpty();
	}
}