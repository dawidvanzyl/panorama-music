using FluentValidation;
using PanoramaMusic.Students.Application.Requests.WaitingList;

namespace PanoramaMusic.Students.Application.Validators.WaitingList;

public sealed class UpdateWaitingListEntryRequestValidator : AbstractValidator<UpdateWaitingListEntryRequest>
{
	public UpdateWaitingListEntryRequestValidator()
	{
		RuleFor(x => x.LessonStructureId)
			.NotNull()
			.NotEqual(Guid.Empty);

		RuleFor(x => x.InstrumentType)
			.NotNull()
			.IsInEnum();

		RuleFor(x => x.Notes)
			.MaximumLength(WaitingListValidationRules.NotesMaxLength);
	}
}
