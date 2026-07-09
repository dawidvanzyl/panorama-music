using FluentValidation;
using PanoramaMusic.Audit.Application.Requests;

namespace PanoramaMusic.Audit.Application.Validators;

public sealed class GetAuditEventsRequestValidator : AbstractValidator<GetAuditEventsRequest>
{
	public GetAuditEventsRequestValidator()
	{
		RuleFor(x => x.Page)
			.GreaterThanOrEqualTo(1)
				.WithMessage("Page must be at least 1.");

		RuleFor(x => x.PageSize)
			.InclusiveBetween(1, 100)
				.WithMessage("Page size must be between 1 and 100.");

		RuleFor(x => x.To)
			.GreaterThanOrEqualTo(x => x.From!.Value)
				.When(x => x.From.HasValue && x.To.HasValue)
				.WithMessage("'to' must be on or after 'from'.");
	}
}