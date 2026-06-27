using Microsoft.AspNetCore.Diagnostics;
using PanoramaMusic.Api.Exceptions;
using PanoramaMusic.Identity.Domain.Exceptions;
using System.Text.Json;

namespace PanoramaMusic.Api.Middleware;

public sealed class ApiExceptionHandler : IExceptionHandler
{
	public async ValueTask<bool> TryHandleAsync(
		HttpContext httpContext,
		Exception exception,
		CancellationToken cancellationToken)
	{
		if (exception is RequestValidationException requestValidation)
		{
			httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
			httpContext.Response.ContentType = "application/json";
			var body = JsonSerializer.Serialize(requestValidation.Errors);
			await httpContext.Response.WriteAsync(body, cancellationToken);
			return true;
		}

		if (exception is UnauthorizedException or InvalidResetTokenException)
		{
			httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
			httpContext.Response.ContentType = "application/json";
			var body = JsonSerializer.Serialize(new { error = exception.Message });
			await httpContext.Response.WriteAsync(body, cancellationToken);
			return true;
		}

		if (exception is EntityNotFoundException notFound)
		{
			httpContext.Response.StatusCode = StatusCodes.Status404NotFound;
			httpContext.Response.ContentType = "application/json";
			var body = JsonSerializer.Serialize(new { error = notFound.Message });
			await httpContext.Response.WriteAsync(body, cancellationToken);
			return true;
		}

		if (exception is DomainException domain)
		{
			httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
			httpContext.Response.ContentType = "application/json";
			var body = JsonSerializer.Serialize(new { error = domain.Message });
			await httpContext.Response.WriteAsync(body, cancellationToken);
			return true;
		}

		return false;
	}
}