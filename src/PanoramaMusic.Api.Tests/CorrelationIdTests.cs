using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Logging;
using PanoramaMusic.Api.Tests.Middleware;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class CorrelationIdTests(ApiTestFixture fixture)
{
	private const string _correlationIdHeader = "X-Correlation-ID";

	[Fact]
	[Trait("AC", "M1.5UC1")]
	public async Task PostLoginWithout_correlationIdHeader_LoginFails_GeneratesUuidAttachedToLogsAndErrorPayload()
	{
		var captureProvider = new CaptureLoggerProvider();
		using var client = CreateClientWithCapture(captureProvider);

		using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
		{
			Content = JsonContent.Create(new { Email = "correlation-uc1@example.com", Password = "WrongPassword123!" }),
		};
		request.Headers.Add(TestRemoteIpStartupFilter.HeaderName, "10.0.1.1");

		var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		var headerValue = response.Headers.GetValues(_correlationIdHeader).Single();
		Guid.TryParse(headerValue, out _).ShouldBeTrue();

		var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
		body.RootElement.GetProperty("correlationId").GetString().ShouldBe(headerValue);

		var handledEntry = captureProvider.Entries.Single(entry => entry.Category == typeof(ApiExceptionHandler).FullName);
		handledEntry.Properties["CorrelationId"].ShouldBe(headerValue);
	}

	[Fact]
	[Trait("AC", "M1.5UC2")]
	public async Task PostLoginWith_correlationIdHeader_LoginFails_PropagatesIdToLogsAndErrorPayload()
	{
		// A GUID, not an arbitrary string: audit rows persist the correlation id as a
		// UUID, so only caller-supplied values that already are one are honoured.
		var suppliedCorrelationId = Guid.NewGuid().ToString();

		var captureProvider = new CaptureLoggerProvider();
		using var client = CreateClientWithCapture(captureProvider);

		using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
		{
			Content = JsonContent.Create(new { Email = "correlation-uc2@example.com", Password = "WrongPassword123!" }),
		};
		request.Headers.Add(TestRemoteIpStartupFilter.HeaderName, "10.0.1.2");
		request.Headers.Add(_correlationIdHeader, suppliedCorrelationId);

		var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
		response.Headers.GetValues(_correlationIdHeader).Single().ShouldBe(suppliedCorrelationId);

		var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
		body.RootElement.GetProperty("correlationId").GetString().ShouldBe(suppliedCorrelationId);

		var handledEntry = captureProvider.Entries.Single(entry => entry.Category == typeof(ApiExceptionHandler).FullName);
		handledEntry.Properties["CorrelationId"].ShouldBe(suppliedCorrelationId);
	}

	[Fact]
	[Trait("AC", "M1.5UC2")]
	public async Task PostLoginWith_nonGuidCorrelationIdHeader_LoginFails_ReplacesItWithAGeneratedGuid()
	{
		const string suppliedCorrelationId = "caller-supplied-correlation-id";

		var captureProvider = new CaptureLoggerProvider();
		using var client = CreateClientWithCapture(captureProvider);

		using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
		{
			Content = JsonContent.Create(new { Email = "correlation-uc2b@example.com", Password = "WrongPassword123!" }),
		};
		request.Headers.Add(TestRemoteIpStartupFilter.HeaderName, "10.0.1.3");
		request.Headers.Add(_correlationIdHeader, suppliedCorrelationId);

		var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		var headerValue = response.Headers.GetValues(_correlationIdHeader).Single();
		headerValue.ShouldNotBe(suppliedCorrelationId);
		Guid.TryParse(headerValue, out _).ShouldBeTrue();
	}

	/// <summary>
	/// Serilog owns the app's logger factory, so the capture provider is installed by
	/// replacing the factory outright — the tests assert on the MEL-level scope and
	/// state that Serilog would receive, not on Serilog's own sinks.
	/// </summary>
	private HttpClient CreateClientWithCapture(CaptureLoggerProvider captureProvider) =>
		fixture.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
			services.AddSingleton<ILoggerFactory>(new LoggerFactory([captureProvider]))))
			.CreateClient();
}