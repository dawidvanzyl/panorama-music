using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Middleware;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class TokenRevocationTests(ApiTestFixture fixture)
{
	private const string _password = "TokenRevocationTests123!";

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task PostLogout_ThenReusingTheSameAccessToken_ReturnsUnauthorized()
	{
		var (email, _) = await SeedActiveUserAsync();
		var client = CreateIsolatedClient("10.0.9.1");
		var (accessToken, _) = await LoginAsync(client, email);

		var logoutResponse = await client.SendAsync(AuthorizedLogoutRequest(accessToken), TestContext.Current.CancellationToken);
		logoutResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		var replayedResponse = await client.SendAsync(AuthorizedProtectedActionRequest(accessToken), TestContext.Current.CancellationToken);

		replayedResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task PostLogout_WithoutAValidAccessToken_StillRevokesTheRefreshToken()
	{
		var (email, _) = await SeedActiveUserAsync();
		var client = CreateIsolatedClient("10.0.9.2");
		var (_, refreshTokenCookie) = await LoginAsync(client, email);

		// Logout must not depend on a still-valid access token — an expired one (e.g. an idle
		// tab) must not block revoking the refresh token. Simulated here by omitting the
		// Authorization header entirely; /logout has no RequireAuthorization() and falls back
		// to the refresh-token cookie alone.
		using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
		logoutRequest.Headers.Add("Cookie", $"__Secure-refresh_token={refreshTokenCookie}");
		var logoutResponse = await client.SendAsync(logoutRequest, TestContext.Current.CancellationToken);
		logoutResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		using var scope = fixture.Services.CreateScope();
		var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
		var tokenHash = RawToken.From(refreshTokenCookie).Hash;
		var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken);

		token!.IsRevoked.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task DeactivateUser_ThenUsingTheirExistingAccessToken_ReturnsUnauthorized()
	{
		var (email, userId) = await SeedActiveUserAsync();
		var client = CreateIsolatedClient("10.0.9.3");
		var (accessToken, _) = await LoginAsync(client, email);

		using var scope = fixture.Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		await userRepository.DeactivateAsync(userId, TestContext.Current.CancellationToken);

		var response = await client.SendAsync(AuthorizedProtectedActionRequest(accessToken), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	// PanoramaMusic.Api.Tests classes share one host/in-memory rate limiter (see
	// ApiTestCollection), running sequentially across the whole assembly. RateLimitingTests
	// deliberately exhausts the default/no-IP-override per-IP login bucket, so every request
	// here needs its own simulated source IP to avoid colliding with that shared state.
	private HttpClient CreateIsolatedClient(string simulatedIp)
	{
		var client = fixture.CreateClient();
		client.DefaultRequestHeaders.Add(TestRemoteIpStartupFilter.HeaderName, simulatedIp);
		return client;
	}

	private static HttpRequestMessage AuthorizedLogoutRequest(string accessToken)
	{
		var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
		return request;
	}

	// /api/users requires authentication (any role) before its AdminPolicy check ever runs, so
	// it works as a generic "is this access token still valid" probe regardless of the test
	// user's own roles — a revoked/invalid token fails authentication itself (401), never
	// reaching the policy check that would otherwise produce 403 for a non-admin.
	private static HttpRequestMessage AuthorizedProtectedActionRequest(string accessToken)
	{
		var request = new HttpRequestMessage(HttpMethod.Get, "/api/users");
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
		return request;
	}

	private async Task<(string Email, Guid UserId)> SeedActiveUserAsync()
	{
		using var scope = fixture.Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();

		var email = $"token-revocation-{Guid.NewGuid()}@example.com";
		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(passwordHashService.Hash(_password));
		user.Activate();
		await userRepository.AddAsync(user, TestContext.Current.CancellationToken);

		return (email, user.UserId);
	}

	private async Task<(string AccessToken, string RefreshTokenCookie)> LoginAsync(HttpClient client, string email)
	{
		var response = await client.PostAsJsonAsync(
			"/api/auth/login",
			new LoginRequest(email, _password),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<AccessTokenResult>(TestContext.Current.CancellationToken);

		var setCookie = response.Headers.GetValues("Set-Cookie").Single(v => v.StartsWith("__Secure-refresh_token=", StringComparison.Ordinal));
		var refreshTokenCookie = Regex.Match(setCookie, "__Secure-refresh_token=([^;]+)").Groups[1].Value;

		return (result!.AccessToken, refreshTokenCookie);
	}
}