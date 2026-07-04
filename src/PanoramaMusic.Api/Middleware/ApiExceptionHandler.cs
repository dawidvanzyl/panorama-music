using Microsoft.AspNetCore.Diagnostics;
using PanoramaMusic.Api.Exceptions;
using PanoramaMusic.Api.Extensions;
using PanoramaMusic.Identity.Domain.Exceptions;
using System.Text.Json;

namespace PanoramaMusic.Api.Middleware;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
	public async ValueTask<bool> TryHandleAsync(
		HttpContext httpContext,
		Exception exception,
		CancellationToken cancellationToken)
	{
		var correlationId = httpContext.GetCorrelationId();

		if (exception is RequestValidationException requestValidation)
		{
			// The validation contract is a bare JSON array, so the correlation id
			// travels on the response header set by CorrelationIdMiddleware instead.
			LogHandled(exception, StatusCodes.Status400BadRequest, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status400BadRequest, requestValidation.Errors, cancellationToken);
			return true;
		}

		if (exception is UnauthorizedException or InvalidResetTokenException)
		{
			LogHandled(exception, StatusCodes.Status401Unauthorized, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status401Unauthorized, new { error = exception.Message, correlationId }, cancellationToken);
			return true;
		}

		if (exception is EntityNotFoundException notFound)
		{
			LogHandled(exception, StatusCodes.Status404NotFound, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status404NotFound, new { error = notFound.Message, correlationId }, cancellationToken);
			return true;
		}

		if (exception is DomainException domain)
		{
			LogHandled(exception, StatusCodes.Status400BadRequest, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status400BadRequest, new { error = domain.Message, correlationId }, cancellationToken);
			return true;
		}

		logger.LogError(
			exception,
			"Unhandled {ExceptionType} while processing request (CorrelationId: {CorrelationId})",
			exception.GetType().Name,
			correlationId);
		await WriteAsync(
			httpContext,
			StatusCodes.Status500InternalServerError,
			new { error = "An unexpected error occurred.", correlationId },
			cancellationToken);
		return true;
	}

	private void LogHandled(Exception exception, int statusCode, string? correlationId) =>
		logger.LogWarning(
			"Handled {ExceptionType} as {StatusCode} (CorrelationId: {CorrelationId})",
			exception.GetType().Name,
			statusCode,
			correlationId);

	private static async Task WriteAsync(HttpContext httpContext, int statusCode, object body, CancellationToken cancellationToken)
	{
		httpContext.Response.StatusCode = statusCode;
		httpContext.Response.ContentType = "application/json";
		await httpContext.Response.WriteAsync(JsonSerializer.Serialize(body), cancellationToken);
	}
}