using FluentValidation;
using PanoramaMusic.Students.Application.Requests.StudentExtraCurriculars;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Validators.StudentExtraCurriculars;

public sealed class AssignExtraCurricularRequestValidator : AbstractValidator<AssignExtraCurricularRequest>
{
	public AssignExtraCurricularRequestValidator()
	{
		// One message for both shapes an unchosen activity can arrive in — absent,
		// and the empty Guid. WithMessage binds only to the validator directly
		// before it, so stating it once against a single predicate is what keeps a
		// null from being refused in FluentValidation's default wording instead of
		// the story's own.
		RuleFor(request => request.ExtraCurricularId)
			.Must(extraCurricularId => extraCurricularId is not null && extraCurricularId != Guid.Empty)
			.WithMessage(StudentExtraCurricularMessages.ActivityRequired);
	}
}