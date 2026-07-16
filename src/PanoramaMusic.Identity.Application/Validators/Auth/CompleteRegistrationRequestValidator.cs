using FluentValidation;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Validators.Auth;

public sealed class CompleteRegistrationRequestValidator : AbstractValidator<CompleteRegistrationRequest>
{
	public CompleteRegistrationRequestValidator(ICommonPasswordService commonPasswordService)
	{
		RuleFor(x => x.InviteToken)
			.NotEmpty();

		RuleFor(x => x.NewPassword)
			.Cascade(CascadeMode.Stop)
			.NotEmpty()
			.MaximumLength(PasswordValidationRules.MaxLength)
			.PasswordPolicy(commonPasswordService);
	}
}