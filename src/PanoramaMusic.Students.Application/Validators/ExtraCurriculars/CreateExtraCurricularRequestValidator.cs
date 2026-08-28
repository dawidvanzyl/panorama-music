using FluentValidation;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Messages;

namespace PanoramaMusic.Students.Application.Validators.ExtraCurriculars;

public sealed class CreateExtraCurricularRequestValidator : AbstractValidator<CreateExtraCurricularRequest>
{
	public CreateExtraCurricularRequestValidator()
	{
		RuleFor(x => x.Description)
			.NotEmpty()
			.MaximumLength(ExtraCurricularValidationRules.DescriptionMaxLength);

		RuleFor(x => x.Phase)
			.NotNull()
			.IsInEnum();

		// An activity owns its slots and cannot exist without one, so an empty
		// collection is refused in the same words the screen uses.
		RuleFor(x => x.PracticeTimes)
			.NotNull()
			.NotEmpty()
			.WithMessage(ExtraCurricularMessages.AtLeastOnePracticeTimeRequired);

		// What one slot must carry is stated once, in the validator the add
		// endpoint uses too, rather than restated here as inline child rules.
		RuleForEach(x => x.PracticeTimes)
			.SetValidator(new PracticeTimeRequestValidator());

		// The day and start time pair is unique within one activity. The refusal
		// names the slot it is about, since a request carrying several is
		// otherwise ambiguous about which one was rejected.
		RuleFor(x => x.PracticeTimes)
			.Must(practiceTimes => FirstDuplicateSlot(practiceTimes) is null)
			// Only reached when a duplicate was found, so the lookup below has an
			// answer to name.
			.WithMessage(request => ExtraCurricularMessages.DuplicatePracticeTime(FirstDuplicateSlot(request.PracticeTimes)!));
	}

	/// <summary>
	/// The first slot a later one repeats, rendered as it reads to a person, or
	/// null when every pair is distinct. Slots still missing a day or a start
	/// time are left to the per-item rules above rather than being reported here
	/// as a duplicate of each other.
	/// </summary>
	private static string? FirstDuplicateSlot(IList<PracticeTimeRequest>? practiceTimes) =>
		practiceTimes?
			.Where(slot => slot.Day is not null && slot.StartTime is not null)
			.GroupBy(slot => (slot.Day!.Value, slot.StartTime!.Value))
			.Where(group => group.Count() > 1)
			.Select(group => $"{group.Key.Item1} {group.Key.Item2:HH\\:mm}")
			.FirstOrDefault();
}