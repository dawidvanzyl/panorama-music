using FluentValidation;
using PanoramaMusic.Identity.Application.Requests.Auth;

namespace PanoramaMusic.Identity.Application.Validators.Auth;

public sealed class RefreshTokenRequestValidator : AbstractValidator<RefreshTokenRequest>
{
	public RefreshTokenRequestValidator()
	{
		RuleFor(x => x.Token)
			.NotEmpty();
	}
}