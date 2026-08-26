using FluentValidation;
using PanoramaMusic.Students.Application.Requests.StudentExtraCurriculars;

namespace PanoramaMusic.Students.Application.Validators.StudentExtraCurriculars;

public sealed class AssignExtraCurricularRequestValidator : AbstractValidator<AssignExtraCurricularRequest>
{
	public AssignExtraCurricularRequestValidator()
	{
		RuleFor(request => request.ExtraCurricularId)
			.NotNull()
			.NotEqual(Guid.Empty)
			.WithMessage("Choose an activity.");
	}
}
