using FluentValidation;
using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Validators.Auth;

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
	public ResetPasswordRequestValidator()
	{
		RuleFor(x => x.Token)
			.NotEmpty();

		RuleFor(x => x.NewPassword)
			.NotEmpty()
			.PasswordPolicy();
	}
}