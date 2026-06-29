using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Middleware;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
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
		var client = fixture.CreateClient();

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
			request.Headers.Add(TestRemoteIpStartupFilter.HeaderName, $"10.0.0.{i + 1}");

			lastResponse = await client.SendAsync(request, TestContext.Current.CancellationToken);
		}

		lastResponse!.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
	}

	[Fact]
	[Trait("AC", "M1.4UC5")]
	public async Task PostRefreshWithSameUnknownTokenFromDifferentIps_PerTokenThresholdExceeded_ReturnsTooManyRequests()
	{
		var client = fixture.CreateClient();

		HttpResponseMessage? lastResponse = null;

		for (var i = 0; i < 4; i++)
		{
			// The token never resolves to an account, so the per-account bucket stays empty.
			// A distinct simulated IP every call rules out the per-IP bucket too, isolating
			// the per-token bucket as the only thing that can return 429 here. The refresh
			// token travels as a cookie, not the body — see RefreshTokenCookieExtensions.
			using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
			request.Headers.Add("Cookie", "refresh_token=not-a-real-refresh-token");
			request.Headers.Add(TestRemoteIpStartupFilter.HeaderName, $"10.0.1.{i + 1}");

			lastResponse = await client.SendAsync(request, TestContext.Current.CancellationToken);
		}

		lastResponse!.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
	}

	[Fact]
	[Trait("AC", "M1.4UC6")]
	public async Task PostRefreshWithSameValidTokenFromDifferentIps_PerAccountThresholdExceeded_ReturnsTooManyRequests()
	{
		var rawToken = await SeedUserWithRefreshTokenAsync();
		var client = fixture.CreateClient();

		HttpResponseMessage? lastResponse = null;

		for (var i = 0; i < 4; i++)
		{
			// The token resolves to the same account every time, but each call comes from a
			// distinct simulated IP, so only the resolved-account bucket can trip here.
			using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
			request.Headers.Add("Cookie", $"refresh_token={rawToken}");
			request.Headers.Add(TestRemoteIpStartupFilter.HeaderName, $"10.0.2.{i + 1}");

			lastResponse = await client.SendAsync(request, TestContext.Current.CancellationToken);
		}

		lastResponse!.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task PostForgotPasswordWithMissingEmailFromDifferentIps_DoesNotShareOneSentinelBucket()
	{
		var client = fixture.CreateClient();

		for (var i = 0; i < 4; i++)
		{
			// Each call omits the email field and comes from a distinct simulated IP. If the
			// missing-field fallback collapsed into one shared bucket (e.g. a constant
			// "unknown" key), the 4th call here would already exceed the account limit (3)
			// even though no two calls share an identity.
			using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/forgot-password")
			{
				Content = JsonContent.Create(new { }),
			};
			request.Headers.Add(TestRemoteIpStartupFilter.HeaderName, $"10.0.3.{i + 1}");

			var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

			response.StatusCode.ShouldNotBe(HttpStatusCode.TooManyRequests);
		}
	}

	private async Task<string> SeedUserWithRefreshTokenAsync()
	{
		using var scope = fixture.Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();

		var user = new User(Guid.NewGuid(), Email.Create($"rate-limit-token-{Guid.NewGuid()}@example.com"), DateTime.UtcNow);
		user.Activate();
		await userRepository.AddAsync(user, TestContext.Current.CancellationToken);

		var rawToken = RawToken.Generate();
		var tokenId = Guid.NewGuid();
		var refreshToken = new RefreshToken(tokenId, user.UserId, rawToken.Hash, DateTime.UtcNow.AddDays(7), tokenId, DateTime.UtcNow);
		await refreshTokenRepository.AddAsync(refreshToken, TestContext.Current.CancellationToken);

		return rawToken.Value;
	}
}