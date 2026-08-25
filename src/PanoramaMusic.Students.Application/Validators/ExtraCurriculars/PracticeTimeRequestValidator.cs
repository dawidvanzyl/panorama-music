using FluentValidation;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;

namespace PanoramaMusic.Students.Application.Validators.ExtraCurriculars;

/// <summary>
/// What one weekly slot must carry, wherever it arrives — as the body of an add
/// against an existing activity, or as one item of a create request's collection.
/// Whether the activity may hold it is a different question, and one only the
/// activity itself can answer.
/// </summary>
public sealed class PracticeTimeRequestValidator : AbstractValidator<PracticeTimeRequest>
{
	public PracticeTimeRequestValidator()
	{
		RuleFor(x => x.Day).NotNull().IsInEnum();
		RuleFor(x => x.StartTime).NotNull();
	}
}
