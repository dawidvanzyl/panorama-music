using FluentValidation;
using PanoramaMusic.Students.Application.Requests;

namespace PanoramaMusic.Students.Application.Validators;

public sealed class AddSiblingRequestValidator : AbstractValidator<AddSiblingRequest>
{
	public AddSiblingRequestValidator()
	{
		RuleFor(x => x.SiblingId)
			.NotEmpty();
	}
}