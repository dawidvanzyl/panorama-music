using FluentValidation;
using PanoramaMusic.Identity.Application.Requests.Admin;

namespace PanoramaMusic.Identity.Application.Validators.Admin;

public sealed class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
	public CreateUserRequestValidator()
	{
		RuleFor(x => x.Email)
			.NotEmpty()
			.EmailAddress();

		RuleFor(x => x.Roles)
			.NotEmpty()
				.WithMessage("At least one role must be assigned.");
	}
}