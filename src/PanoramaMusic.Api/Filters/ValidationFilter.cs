using FluentValidation;
using PanoramaMusic.Api.Exceptions;

namespace PanoramaMusic.Api.Filters;

public sealed class ValidationFilter<TRequest> : IEndpointFilter
	where TRequest : notnull
{
	public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
	{
		var request = context.Arguments.OfType<TRequest>().FirstOrDefault();
		if (request is null)
			return await next(context);

		var validator = context.HttpContext.RequestServices.GetService<IValidator<TRequest>>();
		if (validator is null)
			return await next(context);

		var result = await validator.ValidateAsync(request, context.HttpContext.RequestAborted);
		if (!result.IsValid)
		{
			var errors = result.Errors
				.Select(failure => new RequestValidationError(failure.PropertyName, failure.ErrorMessage))
				.ToList();
			throw new RequestValidationException(errors);
		}

		return await next(context);
	}
}