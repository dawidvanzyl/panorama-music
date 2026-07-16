using FluentValidation;
using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Validators.Auth;

public sealed class RequestPasswordResetRequestValidator : AbstractValidator<RequestPasswordResetRequest>
{
	public RequestPasswordResetRequestValidator()
	{
		RuleFor(x => x.Email)
			.NotEmpty()
			.MaximumLength(EmailValidationRules.MaxLength)
			.EmailAddress();
	}
}