using FluentValidation;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Validators.Auth;

public sealed class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
	public ResetPasswordRequestValidator(ICommonPasswordService commonPasswordService)
	{
		RuleFor(x => x.Token)
			.NotEmpty();

		RuleFor(x => x.NewPassword)
			.Cascade(CascadeMode.Stop)
			.NotEmpty()
			.MaximumLength(PasswordValidationRules.MaxLength)
			.PasswordPolicy(commonPasswordService);
	}
}