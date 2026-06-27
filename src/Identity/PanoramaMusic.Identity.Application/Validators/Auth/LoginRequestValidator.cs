using FluentValidation;
using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Validators.Auth;

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
	public LoginRequestValidator()
	{
		RuleFor(x => x.Email)
			.NotEmpty()
			.EmailAddress();

		RuleFor(x => x.Password)
			.NotEmpty();
	}
}