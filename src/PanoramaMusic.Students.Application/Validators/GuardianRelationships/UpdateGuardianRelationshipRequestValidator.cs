using FluentValidation;
using PanoramaMusic.Students.Application.Requests.GuardianRelationships;

namespace PanoramaMusic.Students.Application.Validators.GuardianRelationships;

public sealed class UpdateGuardianRelationshipRequestValidator : AbstractValidator<UpdateGuardianRelationshipRequest>
{
	public UpdateGuardianRelationshipRequestValidator()
	{
		RuleFor(x => x.Name)
			.NotEmpty()
			.MaximumLength(GuardianRelationshipValidationRules.NameMaxLength);
	}
}