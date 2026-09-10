using FluentValidation;
using PanoramaMusic.Students.Application.Requests.WaitingList;

namespace PanoramaMusic.Students.Application.Validators.WaitingList;

/// <summary>
/// Every member is required. The course this request resolves to is always an
/// instrument course, which records both an instrument type and a step, so
/// neither is conditional here the way it is on the roster's own enrollment.
/// </summary>
public sealed class EnrolWaitingListStudentRequestValidator : AbstractValidator<EnrolWaitingListStudentRequest>
{
	public EnrolWaitingListStudentRequestValidator()
	{
		RuleFor(x => x.LessonStructureId)
			.NotNull()
			.NotEqual(Guid.Empty);

		RuleFor(x => x.TeacherId)
			.NotNull()
			.NotEqual(Guid.Empty);

		RuleFor(x => x.InstrumentType)
			.NotNull()
			.IsInEnum();

		RuleFor(x => x.StepType)
			.NotNull()
			.IsInEnum();

		RuleFor(x => x.EnrolledDate)
			.NotNull();
	}
}
