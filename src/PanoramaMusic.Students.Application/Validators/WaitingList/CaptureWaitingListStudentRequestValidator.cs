using FluentValidation;
using PanoramaMusic.Students.Application.Requests.WaitingList;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Validators.WaitingList;

public sealed class CaptureWaitingListStudentRequestValidator : AbstractValidator<CaptureWaitingListStudentRequest>
{
	public CaptureWaitingListStudentRequestValidator()
	{
		RuleFor(x => x.FirstName)
			.NotEmpty();

		RuleFor(x => x.LastName)
			.NotEmpty();

		RuleFor(x => x.DateOfBirth)
			.LessThan(_ => DateOnly.FromDateTime(DateTime.UtcNow))
				.WithMessage("Date of birth must be in the past.");

		RuleFor(x => x.Class)
			.Must((request, @class) => @class.HasValue != (request.Grade == GradeType.Private))
				.WithMessage("A Private-grade student must not have a class; every other grade requires one.");

		RuleFor(x => x.Phase)
			.Must((request, phase) => phase.HasValue != (request.Grade == GradeType.Private))
				.WithMessage("A Private-grade student must not have a phase; every other grade requires one.");

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