using FluentValidation;
using PanoramaMusic.Identity.Application.Requests.Admin;

namespace PanoramaMusic.Identity.Application.Validators.Admin;

public sealed class UpdateUserRolesRequestValidator : AbstractValidator<UpdateUserRolesRequest>
{
	public UpdateUserRolesRequestValidator()
	{
		RuleFor(x => x.Roles)
			.NotEmpty()
				.WithMessage("At least one role must be assigned.");

		RuleForEach(x => x.Roles)
			.IsInEnum()
				.WithMessage("Roles must be one of the defined role values.");
	}
}