using FluentValidation;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;

namespace PanoramaMusic.Students.Application.Validators.ExtraCurriculars;

public sealed class UpdateExtraCurricularRequestValidator : AbstractValidator<UpdateExtraCurricularRequest>
{
	public UpdateExtraCurricularRequestValidator()
	{
		RuleFor(x => x.Description)
			.NotEmpty()
			.MaximumLength(ExtraCurricularValidationRules.DescriptionMaxLength);

		RuleFor(x => x.Phase)
			.NotNull()
			.IsInEnum();
	}
}