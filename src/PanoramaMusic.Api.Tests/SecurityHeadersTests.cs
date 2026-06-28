using Shouldly;
using Xunit;

namespace PanoramaMusic.Api.Tests;

public sealed class SecurityHeadersTests(ApiTestFixture fixture) : IClassFixture<ApiTestFixture>
{
	[Fact]
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
}