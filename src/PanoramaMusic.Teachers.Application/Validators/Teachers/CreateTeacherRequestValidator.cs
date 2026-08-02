using FluentValidation;
using PanoramaMusic.Teachers.Application.Requests.Teachers;

namespace PanoramaMusic.Teachers.Application.Validators.Teachers;

public sealed class CreateTeacherRequestValidator : AbstractValidator<CreateTeacherRequest>
{
	public CreateTeacherRequestValidator()
	{
		RuleFor(x => x.FirstName)
			.NotEmpty();

		RuleFor(x => x.Surname)
			.NotEmpty();
	}
}