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
			.Custom((to, context) =>
			{
				if (to is null)
					return;

				if (!AuditToDateResolver.TryResolveInclusiveUpperBound(to, out var resolvedTo))
				{
					context.AddFailure("'to' must be a valid ISO 8601 date or date-time.");
					return;
				}

				if (context.InstanceToValidate.From.HasValue && resolvedTo!.Value < context.InstanceToValidate.From.Value)
				{
					context.AddFailure("'to' must be on or after 'from'.");
				}
			});
	}
}