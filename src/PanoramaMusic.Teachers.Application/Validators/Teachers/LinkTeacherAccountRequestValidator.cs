using FluentValidation;
using PanoramaMusic.Teachers.Application.Requests.Teachers;

namespace PanoramaMusic.Teachers.Application.Validators.Teachers;

public sealed class LinkTeacherAccountRequestValidator : AbstractValidator<LinkTeacherAccountRequest>
{
	public LinkTeacherAccountRequestValidator()
	{
		RuleFor(x => x.AccountId)
			.NotEmpty();
	}
}