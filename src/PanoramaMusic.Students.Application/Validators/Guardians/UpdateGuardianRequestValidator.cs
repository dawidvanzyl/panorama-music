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
			.NotEmpty()
			.MaximumLength(GuardianValidationRules.NameMaxLength);

		RuleFor(x => x.Surname)
			.NotEmpty()
			.MaximumLength(GuardianValidationRules.NameMaxLength);

		RuleFor(x => x.Cell)
			.MaximumLength(GuardianValidationRules.CellMaxLength)
			.When(x => !string.IsNullOrEmpty(x.Cell));

		RuleFor(x => x.Email)
			.EmailAddress()
			.MaximumLength(GuardianValidationRules.EmailMaxLength)
			.When(x => !string.IsNullOrEmpty(x.Email));
	}
}