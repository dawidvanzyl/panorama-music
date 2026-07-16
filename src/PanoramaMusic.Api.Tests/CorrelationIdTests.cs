using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Providers;
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
		var isolatedHttpClient = fixture.CreateIsolatedClientWithCapture(captureProvider, "10.0.1.1");

		using var client = isolatedHttpClient.Client;
		using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
		{
			Content = JsonContent.Create(new { Email = "correlation-uc1@example.com", Password = "WrongPassword123!" }),
		};

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
		var isolatedHttpClient = fixture.CreateIsolatedClientWithCapture(captureProvider, "10.0.1.2");

		using var client = isolatedHttpClient.Client;

		using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
		{
			Content = JsonContent.Create(new { Email = "correlation-uc2@example.com", Password = "WrongPassword123!" }),
		};
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
		var isolatedHttpClient = fixture.CreateIsolatedClientWithCapture(captureProvider, "10.0.1.3");

		using var client = isolatedHttpClient.Client;
		using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
		{
			Content = JsonContent.Create(new { Email = "correlation-uc2b@example.com", Password = "WrongPassword123!" }),
		};
		request.Headers.Add(_correlationIdHeader, suppliedCorrelationId);

		var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		var headerValue = response.Headers.GetValues(_correlationIdHeader).Single();
		headerValue.ShouldNotBe(suppliedCorrelationId);
		Guid.TryParse(headerValue, out _).ShouldBeTrue();
	}
}