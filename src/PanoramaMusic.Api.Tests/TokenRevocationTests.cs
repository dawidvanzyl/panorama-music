using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using System.Net;
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
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "token-revocation");
		var client = fixture.CreateIsolatedClient("10.0.9.1");
		await client.LoginAsync(email, _password);

		var logoutResponse = await client.Client.SendAsync(client.AuthorizedPostRequest("/api/auth/logout"), TestContext.Current.CancellationToken);
		logoutResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		// /api/users requires authentication (any role) before its AdminPolicy check ever runs, so
		// it works as a generic "is this access token still valid" probe regardless of the test
		// user's own roles — a revoked/invalid token fails authentication itself (401), never
		// reaching the policy check that would otherwise produce 403 for a non-admin.
		var replayedResponse = await client.Client.SendAsync(client.AuthorizedGetRequest("/api/users"), TestContext.Current.CancellationToken);

		replayedResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task PostLogout_WithoutAValidAccessToken_StillRevokesTheRefreshToken()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "token-revocation");
		var client = fixture.CreateIsolatedClient("10.0.9.2");
		await client.LoginAsync(email, _password);
		var refreshTokenCookie = client.RefreshTokenCookie;

		// Logout must not depend on a still-valid access token — an expired one (e.g. an idle
		// tab) must not block revoking the refresh token. Simulated here by omitting the
		// Authorization header entirely; /logout has no RequireAuthorization() and falls back
		// to the refresh-token cookie alone.
		using var logoutRequest = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
		logoutRequest.Headers.Add("Cookie", $"__Secure-refresh_token={refreshTokenCookie}");
		var logoutResponse = await client.Client.SendAsync(logoutRequest, TestContext.Current.CancellationToken);
		logoutResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		using var scope = fixture.Services.CreateScope();
		var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(TestContext.Current.CancellationToken);
		var tokenHash = RawToken.From(refreshTokenCookie).Hash;
		var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken);
		await unitOfWork.CommitAsync(TestContext.Current.CancellationToken);

		token!.IsRevoked.ShouldBeTrue();
	}

	[Fact]
	[Trait("AC", "M1.4UC4")]
	public async Task DeactivateUser_ThenUsingTheirExistingAccessToken_ReturnsUnauthorized()
	{
		var (email, userId) = await fixture.SeedActiveUserAsync(_password, "token-revocation");
		var client = fixture.CreateIsolatedClient("10.0.9.3");
		await client.LoginAsync(email, _password);

		using var scope = fixture.Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(TestContext.Current.CancellationToken);
		await userRepository.DeactivateAsync(userId, TestContext.Current.CancellationToken);
		await unitOfWork.CommitAsync(TestContext.Current.CancellationToken);

		var response = await client.Client.SendAsync(client.AuthorizedGetRequest("/api/users"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}
}