using FluentValidation;
using PanoramaMusic.Students.Application.Requests;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Application.Validators;

public sealed class CreateStudentRequestValidator : AbstractValidator<CreateStudentRequest>
{
	public CreateStudentRequestValidator()
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
	}
}