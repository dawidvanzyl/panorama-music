using FluentValidation;
using PanoramaMusic.Students.Application.Requests.GuardianRelationships;

namespace PanoramaMusic.Students.Application.Validators.GuardianRelationships;

public sealed class CreateGuardianRelationshipRequestValidator : AbstractValidator<CreateGuardianRelationshipRequest>
{
	public CreateGuardianRelationshipRequestValidator()
	{
		RuleFor(x => x.Name)
			.NotEmpty()
			.MaximumLength(GuardianRelationshipValidationRules.NameMaxLength);
	}
}