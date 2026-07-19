using FluentValidation;
using PanoramaMusic.Students.Application.Requests;

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
	}
}