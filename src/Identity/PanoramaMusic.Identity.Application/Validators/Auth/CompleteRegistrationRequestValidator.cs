using FluentValidation;
using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Validators.Auth;

public sealed class CompleteRegistrationRequestValidator : AbstractValidator<CompleteRegistrationRequest>
{
	public CompleteRegistrationRequestValidator()
	{
		RuleFor(x => x.InviteToken)
			.NotEmpty();

		RuleFor(x => x.NewPassword)
			.NotEmpty()
			.PasswordPolicy();
	}
}