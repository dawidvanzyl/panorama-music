using Shouldly;
using System.Net.Http.Json;
using Xunit;

namespace PanoramaMusic.Api.Tests;

public sealed class SecurityHeadersTests(ApiTestFixture fixture) : IClassFixture<ApiTestFixture>
{
	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task GetRoot_StaticHtmlResponse_CarriesSecurityHeadersIncludingCoop()
	{
		var client = fixture.CreateClient();

		var response = await client.GetAsync("/", TestContext.Current.CancellationToken);

		response.Content.Headers.ContentType?.MediaType.ShouldBe("text/html");
		response.Headers.GetValues("Strict-Transport-Security").ShouldContain("max-age=31536000; includeSubDomains");
		response.Headers.GetValues("X-Content-Type-Options").ShouldContain("nosniff");
		response.Headers.GetValues("Referrer-Policy").ShouldContain("no-referrer");
		response.Headers.GetValues("Content-Security-Policy").Single().ShouldContain("object-src 'none'");
		response.Headers.GetValues("Cross-Origin-Opener-Policy").ShouldContain("same-origin");
	}

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task GetHealth_JsonResponse_CarriesSecurityHeadersWithoutCoop()
	{
		var client = fixture.CreateClient();

		var response = await client.GetAsync("/api/health", TestContext.Current.CancellationToken);

		response.Content.Headers.ContentType?.MediaType.ShouldBe("application/json");
		response.Headers.GetValues("Strict-Transport-Security").ShouldContain("max-age=31536000; includeSubDomains");
		response.Headers.GetValues("X-Content-Type-Options").ShouldContain("nosniff");
		response.Headers.GetValues("Referrer-Policy").ShouldContain("no-referrer");
		response.Headers.GetValues("Content-Security-Policy").Single().ShouldContain("object-src 'none'");
		response.Headers.Contains("Cross-Origin-Opener-Policy").ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task PostLogin_SensitiveEndpoint_CarriesCacheControlNoStore()
	{
		var client = fixture.CreateClient();

		var response = await client.PostAsJsonAsync("/api/auth/login", new { }, TestContext.Current.CancellationToken);

		response.Headers.GetValues("Cache-Control").ShouldContain(value => value.Contains("no-store"));
	}
}