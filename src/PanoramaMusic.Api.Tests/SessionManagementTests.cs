using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Middleware;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class SessionManagementTests(ApiTestFixture fixture)
{
	private const string _password = "SessionManagementTests123!";

	private static readonly JsonSerializerOptions _jsonOptions = new()
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "M1.4IT5")]
	public async Task RevokeOwnSession_OtherThanCurrent_DisappearsAndIsNoLongerUsable()
	{
		var (email, _) = await SeedActiveUserAsync();
		var client = CreateIsolatedClient("10.0.10.1");
		var (_, firstSessionToken) = await LoginAsync(client, email);
		var (secondAccessToken, secondSessionToken) = await LoginAsync(client, email);

		var firstSessionId = await GetSessionIdForRefreshTokenAsync(firstSessionToken);

		var revokeResponse = await client.SendAsync(
			AuthorizedDeleteRequest($"/api/auth/sessions/{firstSessionId}", secondAccessToken),
			TestContext.Current.CancellationToken);
		revokeResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		var listResponse = await client.SendAsync(
			AuthorizedGetRequest("/api/auth/sessions", secondAccessToken),
			TestContext.Current.CancellationToken);
		var sessions = await listResponse.Content.ReadFromJsonAsync<List<SessionResult>>(TestContext.Current.CancellationToken);
		sessions!.ShouldNotContain(s => s.TokenId == firstSessionId);

		var refreshUsingRevokedSession = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
		refreshUsingRevokedSession.Headers.Add("Cookie", $"__Secure-refresh_token={firstSessionToken}");
		var refreshResponse = await client.SendAsync(refreshUsingRevokedSession, TestContext.Current.CancellationToken);
		refreshResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "M1.4IT6")]
	public async Task AdminRevokeSpecificUsersSession_DisappearsAndIsNoLongerUsableByThatUser()
	{
		var (adminEmail, adminUserId) = await SeedActiveUserAsync(Role.Admin);
		var (memberEmail, _) = await SeedActiveUserAsync();
		var adminClient = CreateIsolatedClient("10.0.10.2");
		var memberClient = CreateIsolatedClient("10.0.10.3");

		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);
		var (_, memberSessionToken) = await LoginAsync(memberClient, memberEmail);
		var memberSessionId = await GetSessionIdForRefreshTokenAsync(memberSessionToken);

		var revokeResponse = await adminClient.SendAsync(
			AuthorizedDeleteRequest($"/api/auth/admin/sessions/{memberSessionId}", adminAccessToken),
			TestContext.Current.CancellationToken);
		revokeResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		var listResponse = await adminClient.SendAsync(
			AuthorizedGetRequest("/api/auth/admin/sessions", adminAccessToken),
			TestContext.Current.CancellationToken);
		var sessions = await listResponse.Content.ReadFromJsonAsync<List<AdminSessionResult>>(_jsonOptions, TestContext.Current.CancellationToken);
		sessions!.ShouldNotContain(s => s.TokenId == memberSessionId);

		var refreshUsingRevokedSession = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
		refreshUsingRevokedSession.Headers.Add("Cookie", $"__Secure-refresh_token={memberSessionToken}");
		var refreshResponse = await memberClient.SendAsync(refreshUsingRevokedSession, TestContext.Current.CancellationToken);
		refreshResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		_ = adminUserId;
	}

	[Fact]
	[Trait("AC", "M1.4UC10")]
	public async Task NonAdmin_RequestsGlobalSessionListOrRevokesAnotherUsersSession_IsDenied()
	{
		var (memberEmail, _) = await SeedActiveUserAsync();
		var client = CreateIsolatedClient("10.0.10.4");
		var (memberAccessToken, _) = await LoginAsync(client, memberEmail);

		var listResponse = await client.SendAsync(
			AuthorizedGetRequest("/api/auth/admin/sessions", memberAccessToken),
			TestContext.Current.CancellationToken);
		listResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden);

		var revokeResponse = await client.SendAsync(
			AuthorizedDeleteRequest($"/api/auth/admin/sessions/{Guid.NewGuid()}", memberAccessToken),
			TestContext.Current.CancellationToken);
		revokeResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	private HttpClient CreateIsolatedClient(string simulatedIp)
	{
		var client = fixture.CreateClient();
		client.DefaultRequestHeaders.Add(TestRemoteIpStartupFilter.HeaderName, simulatedIp);
		return client;
	}

	private static HttpRequestMessage AuthorizedGetRequest(string path, string accessToken)
	{
		var request = new HttpRequestMessage(HttpMethod.Get, path);
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
		return request;
	}

	private static HttpRequestMessage AuthorizedDeleteRequest(string path, string accessToken)
	{
		var request = new HttpRequestMessage(HttpMethod.Delete, path);
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
		return request;
	}

	private async Task<Guid> GetSessionIdForRefreshTokenAsync(string refreshTokenCookie)
	{
		using var scope = fixture.Services.CreateScope();
		var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
		var tokenHash = RawToken.From(refreshTokenCookie).Hash;
		var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken);
		return token!.TokenId;
	}

	private async Task<(string Email, Guid UserId)> SeedActiveUserAsync(Role? role = null)
	{
		using var scope = fixture.Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var userRoleRepository = scope.ServiceProvider.GetRequiredService<IUserRoleRepository>();
		var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();

		var email = $"session-management-{Guid.NewGuid()}@example.com";
		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(passwordHashService.Hash(_password));
		user.Activate();
		await userRepository.AddAsync(user, TestContext.Current.CancellationToken);

		if (role.HasValue)
			await userRoleRepository.AddAsync(new UserRole(user.UserId, role.Value), TestContext.Current.CancellationToken);

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