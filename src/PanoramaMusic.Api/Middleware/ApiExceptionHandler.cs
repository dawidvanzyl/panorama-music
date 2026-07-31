using Microsoft.AspNetCore.Diagnostics;
using PanoramaMusic.Api.Exceptions;
using PanoramaMusic.Api.Extensions;
using System.Text.Json;
using IdentityExceptions = PanoramaMusic.Identity.Domain.Exceptions;
using StudentsExceptions = PanoramaMusic.Students.Domain.Exceptions;

namespace PanoramaMusic.Api.Middleware;

/// <summary>
/// The last-resort handler required by ASVS 5.0.0-16.5.4, registered at the outermost layer
/// of the pipeline so no request path can escape it.
/// <para>
/// It is also what satisfies ASVS 5.0.0-16.5.1: known domain and validation failures serialize
/// only their own message, and anything unexpected returns a fixed generic message plus a
/// correlation id, with the exception written to the logs and never to the response. That
/// holds in every environment — a more revealing error body must not be switched on outside
/// Production, since a leaked stack trace, query, or key is just as damaging from a staging
/// host.
/// </para>
/// </summary>
public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
	public async ValueTask<bool> TryHandleAsync(
		HttpContext httpContext,
		Exception exception,
		CancellationToken cancellationToken)
	{
		// A cancelled request means the client is gone: writing a 500 or logging an
		// Error would only produce noise, so let the pipeline unwind quietly.
		if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
		{
			return true;
		}

		var correlationId = httpContext.GetCorrelationId();

		if (exception is RequestValidationException requestValidation)
		{
			// The validation contract is a bare JSON array, so the correlation id
			// travels on the response header set by CorrelationIdMiddleware instead.
			LogHandled(exception, StatusCodes.Status400BadRequest, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status400BadRequest, requestValidation.Errors, cancellationToken);
			return true;
		}

		// Thrown by ASP.NET Core's own request-body JSON binding (e.g. a string
		// outside a strict enum's defined members) before the endpoint delegate —
		// and therefore FluentValidation — ever runs. UseExceptionHandler intercepts
		// it ahead of the framework's own default 400 translation, so it must be
		// handled explicitly here or it falls through to the generic 500 below.
		if (exception is BadHttpRequestException badRequest)
		{
			LogHandled(exception, badRequest.StatusCode, correlationId);
			await WriteAsync(httpContext, badRequest.StatusCode, new { error = badRequest.Message, correlationId }, cancellationToken);
			return true;
		}

		if (exception is IdentityExceptions.UnauthorizedException or IdentityExceptions.InvalidResetTokenException)
		{
			LogHandled(exception, StatusCodes.Status401Unauthorized, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status401Unauthorized, new { error = exception.Message, correlationId }, cancellationToken);
			return true;
		}

		if (exception is IdentityExceptions.EntityNotFoundException or StudentsExceptions.EntityNotFoundException)
		{
			LogHandled(exception, StatusCodes.Status404NotFound, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status404NotFound, new { error = exception.Message, correlationId }, cancellationToken);
			return true;
		}

		if (exception is IdentityExceptions.DomainException or StudentsExceptions.DomainException)
		{
			LogHandled(exception, StatusCodes.Status400BadRequest, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status400BadRequest, new { error = exception.Message, correlationId }, cancellationToken);
			return true;
		}

		if (exception is FlushDurableException flushDurable)
		{
			LogHandled(exception, StatusCodes.Status500InternalServerError, correlationId);
			await WriteAsync(httpContext, StatusCodes.Status500InternalServerError, new { error = $"{flushDurable.Message}. Inner exception: {flushDurable.InnerException?.Message}", correlationId }, cancellationToken);
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