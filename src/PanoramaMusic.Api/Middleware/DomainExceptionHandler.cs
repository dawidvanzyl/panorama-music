using Microsoft.AspNetCore.Diagnostics;
using PanoramaMusic.Identity.Domain.Exceptions;
using System.Text.Json;

namespace PanoramaMusic.Api.Middleware;

public sealed class DomainExceptionHandler : IExceptionHandler
{
	public async ValueTask<bool> TryHandleAsync(
		HttpContext httpContext,
		Exception exception,
		CancellationToken cancellationToken)
	{
		if (exception is UnauthorizedException unauthorized)
		{
			httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
			httpContext.Response.ContentType = "application/json";
			var body = JsonSerializer.Serialize(new { error = unauthorized.Message });
			await httpContext.Response.WriteAsync(body, cancellationToken);
			return true;
		}

		if (exception is PasswordPolicyException passwordPolicy)
		{
			httpContext.Response.StatusCode = StatusCodes.Status422UnprocessableEntity;
			httpContext.Response.ContentType = "application/json";
			var body = JsonSerializer.Serialize(new { error = passwordPolicy.Message, rules = passwordPolicy.FailedRules });
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