using FluentValidation;
using PanoramaMusic.Students.Application.Requests.Guardians;

namespace PanoramaMusic.Students.Application.Validators.Guardians;

public sealed class UpdateGuardianRequestValidator : AbstractValidator<UpdateGuardianRequest>
{
	public UpdateGuardianRequestValidator()
	{
		RuleFor(x => x.GuardianRelationshipId)
			.NotEmpty();

		RuleFor(x => x.FirstName)
			.NotEmpty();

		RuleFor(x => x.Surname)
			.NotEmpty();

		RuleFor(x => x.Email)
			.EmailAddress()
			.When(x => !string.IsNullOrEmpty(x.Email));
	}
}