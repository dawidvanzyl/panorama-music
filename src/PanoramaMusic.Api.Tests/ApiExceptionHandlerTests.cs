using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Tests.Logging;
using PanoramaMusic.Identity.Domain.Exceptions;
using Shouldly;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Api.Tests;

public sealed class ApiExceptionHandlerTests
{
	private const string _correlationId = "test-correlation-id";

	private readonly CaptureLoggerProvider _captureProvider = new();
	private readonly ApiExceptionHandler _handler;

	public ApiExceptionHandlerTests()
	{
		var loggerFactory = new LoggerFactory([_captureProvider]);
		_handler = new ApiExceptionHandler(loggerFactory.CreateLogger<ApiExceptionHandler>());
	}

	[Fact]
	[Trait("AC", "M1.5UC3")]
	public async Task TryHandleAsync_HandledAuthException_LogsWarningWithTypeAndCorrelationIdWithoutSensitiveData()
	{
		var httpContext = CreateHttpContext();
		var exception = new UnauthorizedException("Invalid credentials.");

		var handled = await _handler.TryHandleAsync(httpContext, exception, TestContext.Current.CancellationToken);

		handled.ShouldBeTrue();
		httpContext.Response.StatusCode.ShouldBe(StatusCodes.Status401Unauthorized);

		var entry = _captureProvider.Entries.Single();
		entry.Level.ShouldBe(LogLevel.Warning);
		entry.Properties["ExceptionType"].ShouldBe(nameof(UnauthorizedException));
		entry.Properties["CorrelationId"].ShouldBe(_correlationId);

		var body = JsonDocument.Parse(ReadBody(httpContext));
		body.RootElement.GetProperty("error").GetString().ShouldBe("Invalid credentials.");
		body.RootElement.GetProperty("correlationId").GetString().ShouldBe(_correlationId);
		body.RootElement.EnumerateObject().Select(property => property.Name)
			.ShouldBe(["error", "correlationId"], ignoreOrder: true);
	}

	[Fact]
	[Trait("AC", "M1.5UC4")]
	public async Task TryHandleAsync_UnexpectedException_LogsErrorWithDetailsAndCorrelationIdWithoutLeakingIntoResponse()
	{
		var httpContext = CreateHttpContext();
		var exception = new InvalidOperationException("Connection failed for Password=super-secret-value");

		var handled = await _handler.TryHandleAsync(httpContext, exception, TestContext.Current.CancellationToken);

		handled.ShouldBeTrue();
		httpContext.Response.StatusCode.ShouldBe(StatusCodes.Status500InternalServerError);

		var entry = _captureProvider.Entries.Single();
		entry.Level.ShouldBe(LogLevel.Error);
		entry.Exception.ShouldBe(exception);
		entry.Properties["CorrelationId"].ShouldBe(_correlationId);

		var responseBody = ReadBody(httpContext);
		responseBody.ShouldNotContain("super-secret-value");

		var body = JsonDocument.Parse(responseBody);
		body.RootElement.GetProperty("error").GetString().ShouldBe("An unexpected error occurred.");
		body.RootElement.GetProperty("correlationId").GetString().ShouldBe(_correlationId);
	}

	private static DefaultHttpContext CreateHttpContext()
	{
		var httpContext = new DefaultHttpContext();
		httpContext.Items[CorrelationIdMiddleware.ItemKey] = _correlationId;
		httpContext.Response.Body = new MemoryStream();
		return httpContext;
	}

	private static string ReadBody(HttpContext httpContext)
	{
		httpContext.Response.Body.Position = 0;
		using var reader = new StreamReader(httpContext.Response.Body);
		return reader.ReadToEnd();
	}
}