using PanoramaMusic.Api.Tests.Fixtures;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class RateLimitingTests(ApiTestFixture fixture)
{
	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task PostLoginWithDifferentAccountsFromSameClient_PerIpThresholdExceeded_ReturnsTooManyRequests()
	{
		var client = fixture.CreateClient();

		HttpResponseMessage? lastResponse = null;

		for (var i = 0; i < 11; i++)
		{
			// A distinct email per call keeps every per-account bucket far from its own
			// threshold, so a 429 here can only come from the per-IP bucket tripping.
			lastResponse = await client.PostAsJsonAsync(
				"/api/auth/login",
				new { Email = $"ip-test-{i}@example.com", Password = "WrongPassword123!" },
				TestContext.Current.CancellationToken);
		}

		lastResponse!.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task PostForgotPasswordForSameAccountFromDifferentIps_PerAccountThresholdExceeded_ReturnsTooManyRequests()
	{
		var isolatedHttpClient = fixture.CreateIsolatedClient("10.0.0.1");
		var client = isolatedHttpClient.Client;

		HttpResponseMessage? lastResponse = null;

		for (var i = 0; i < 4; i++)
		{
			// Same account, a distinct simulated source IP every call: the per-IP bucket for
			// each of those IPs only ever sees one request, so a 429 here can only come from
			// the per-account bucket tripping at its configured limit (3).
			using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/forgot-password")
			{
				Content = JsonContent.Create(new { Email = "rate-limit-account@example.com" }),
			};
			lastResponse = await client.SendAsync(request, TestContext.Current.CancellationToken);
		}

		lastResponse!.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public async Task PostRefreshWithSameUnknownTokenFromDifferentIps_PerTokenThresholdExceeded_ReturnsTooManyRequests()
	{
		HttpResponseMessage? lastResponse = null;
		for (var i = 0; i < 4; i++)
		{
			// The token never resolves to an account, so the per-account bucket stays empty.
			// A distinct simulated IP every call rules out the per-IP bucket too, isolating
			// the per-token bucket as the only thing that can return 429 here. The refresh
			// token travels as a cookie, not the body — see RefreshTokenCookieExtensions.

			var isolatedHttpClient = fixture.CreateIsolatedClient($"10.0.1.{i + 1}");
			var client = isolatedHttpClient.Client;

			using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
			request.Headers.Add("Cookie", "__Secure-refresh_token=not-a-real-refresh-token");

			lastResponse = await client.SendAsync(request, TestContext.Current.CancellationToken);
		}

		lastResponse!.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
	}

	[Fact]
	[Trait("AC", "M1.4UC6")]
	public async Task PostRefreshWithSameValidTokenFromDifferentIps_PerAccountThresholdExceeded_ReturnsTooManyRequests()
	{
		var rawToken = await fixture.SeedUserWithRefreshTokenAsync();

		HttpResponseMessage? lastResponse = null;

		for (var i = 0; i < 4; i++)
		{
			// The token resolves to the same account every time, but each call comes from a
			// distinct simulated IP, so only the resolved-account bucket can trip here.
			var isolatedHttpClient = fixture.CreateIsolatedClient($"10.0.2.{i + 1}");
			var client = isolatedHttpClient.Client;

			using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
			request.Headers.Add("Cookie", $"__Secure-refresh_token={rawToken}");

			lastResponse = await client.SendAsync(request, TestContext.Current.CancellationToken);
		}

		lastResponse!.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task PostForgotPasswordWithMissingEmailFromDifferentIps_DoesNotShareOneSentinelBucket()
	{
		for (var i = 0; i < 4; i++)
		{
			// Each call omits the email field and comes from a distinct simulated IP. If the
			// missing-field fallback collapsed into one shared bucket (e.g. a constant
			// "unknown" key), the 4th call here would already exceed the account limit (3)
			// even though no two calls share an identity.
			var isolatedHttpClient = fixture.CreateIsolatedClient($"10.0.3.{i + 1}");
			var client = isolatedHttpClient.Client;

			using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/forgot-password")
			{
				Content = JsonContent.Create(new { }),
			};

			var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

			response.StatusCode.ShouldNotBe(HttpStatusCode.TooManyRequests);
		}
	}
}