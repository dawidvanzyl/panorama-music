using FluentValidation;
using PanoramaMusic.Students.Application.Requests.Siblings;

namespace PanoramaMusic.Students.Application.Validators.Siblings;

public sealed class AddSiblingRequestValidator : AbstractValidator<AddSiblingRequest>
{
	public AddSiblingRequestValidator()
	{
		RuleFor(x => x.SiblingId)
			.NotEmpty();
	}
}