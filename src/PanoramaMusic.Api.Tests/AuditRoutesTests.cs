using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Middleware;
using PanoramaMusic.Audit.Application.Models;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class AuditRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "AuditRoutesTests123!";

	[Fact]
	[Trait("AC", "M1.5UC11")]
	public async Task AdminGetsAuditEvents_NoFilters_ReturnsPagedDisplayFieldsOnlyWithoutDetailOrTargetId()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var adminClient = CreateIsolatedClient("10.0.30.1");
		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);

		var response = await adminClient.SendAsync(
			AuthorizedGetRequest("/api/audit", adminAccessToken),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		using var document = JsonDocument.Parse(body);

		document.RootElement.TryGetProperty("items", out var items).ShouldBeTrue();
		items.GetArrayLength().ShouldBeGreaterThan(0);

		var firstItem = items[0];
		firstItem.TryGetProperty("detail", out _).ShouldBeFalse();
		firstItem.TryGetProperty("targetId", out _).ShouldBeFalse();
		firstItem.TryGetProperty("occurredAt", out _).ShouldBeTrue();
		firstItem.TryGetProperty("eventType", out _).ShouldBeTrue();
		firstItem.TryGetProperty("actorEmail", out _).ShouldBeTrue();
		firstItem.TryGetProperty("targetDisplay", out _).ShouldBeTrue();
		firstItem.TryGetProperty("outcome", out _).ShouldBeTrue();
		firstItem.TryGetProperty("reason", out _).ShouldBeTrue();
		firstItem.TryGetProperty("sourceIp", out _).ShouldBeTrue();

		document.RootElement.TryGetProperty("totalCount", out _).ShouldBeTrue();
		document.RootElement.GetProperty("page").GetInt32().ShouldBe(1);
		document.RootElement.GetProperty("pageSize").GetInt32().ShouldBe(25);
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithEventTypeFilter_ReturnsOnlyMatchingFailedLoginEvent()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var (memberEmail, _) = await SeedActiveUserAsync();

		var adminClient = CreateIsolatedClient("10.0.30.2");
		var memberClient = CreateIsolatedClient("10.0.30.3");

		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);

		// A failed login has no authenticated actor, so actor_email is null at
		// the top level — the attempted email only lives in the detail bag.
		// Filtering by event type alone still isolates it.
		await FailedLoginAsync(memberClient, memberEmail);

		var result = await GetAuditPageAsync(
			adminClient, adminAccessToken, actor: null, eventType: "identity.user.login_failed", page: 1, pageSize: 25);

		result.Items.ShouldContain(item => item.TargetDisplay == memberEmail && item.Outcome == "failure");
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithActorAndEventTypeFilters_ReturnsOnlyThatActorsSuccessfulLogin()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var (memberEmail, _) = await SeedActiveUserAsync();

		var adminClient = CreateIsolatedClient("10.0.30.7");
		var memberClient = CreateIsolatedClient("10.0.30.8");

		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);
		await LoginAsync(memberClient, memberEmail);

		var result = await GetAuditPageAsync(
			adminClient, adminAccessToken, actor: memberEmail, eventType: "identity.user.login_succeeded", page: 1, pageSize: 25);

		result.TotalCount.ShouldBe(1);
		result.Items.Count.ShouldBe(1);
		result.Items[0].ActorEmail.ShouldBe(memberEmail);
		result.Items[0].EventType.ShouldBe("identity.user.login_succeeded");
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithPageSizeOne_PaginatesAcrossPagesWithoutDuplicatesOrGaps()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var adminClient = CreateIsolatedClient("10.0.30.4");
		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);

		// Two more logins on top of the one above produce 3 distinct
		// login_succeeded rows scoped to this test's unique admin email.
		await LoginAsync(adminClient, adminEmail);
		await LoginAsync(adminClient, adminEmail);

		var page1 = await GetAuditPageAsync(adminClient, adminAccessToken, adminEmail, "identity.user.login_succeeded", page: 1, pageSize: 1);
		var page2 = await GetAuditPageAsync(adminClient, adminAccessToken, adminEmail, "identity.user.login_succeeded", page: 2, pageSize: 1);
		var page3 = await GetAuditPageAsync(adminClient, adminAccessToken, adminEmail, "identity.user.login_succeeded", page: 3, pageSize: 1);

		page1.TotalCount.ShouldBe(3);
		page1.Items.Count.ShouldBe(1);
		page2.Items.Count.ShouldBe(1);
		page3.Items.Count.ShouldBe(1);

		var distinctTimestamps = new[] { page1, page2, page3 }
			.SelectMany(p => p.Items)
			.Select(i => i.OccurredAt)
			.Distinct()
			.Count();
		distinctTimestamps.ShouldBe(3);
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithBareDateToFilter_IncludesEventsForTheEntireNamedDay()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var adminClient = CreateIsolatedClient("10.0.31.1");
		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);

		// A bare date (no time component) — e.g. a direct API caller, or the
		// UI falling back to the documented "ISO date" contract — must still
		// be treated as inclusive of the entire UTC day it names.
		var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
		var result = await GetAuditPageAsync(
			adminClient, adminAccessToken, adminEmail, "identity.user.login_succeeded", page: 1, pageSize: 25, to: today);

		result.Items.ShouldContain(i => i.ActorEmail == adminEmail);
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithBareDateFromFilter_IncludesEventsFromThatDayOnward()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var adminClient = CreateIsolatedClient("10.0.31.4");
		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);

		// Unlike "to", a bare date "from" needs no day-expansion logic — its
		// own UTC midnight is already the correct inclusive lower bound — but
		// it still binds as DateTime.Kind=Unspecified, unlike "to" which now
		// goes through AuditToDateResolver's explicit UTC resolution. Verified
		// (by temporarily forcing the test container's session to a non-UTC
		// zone) that this is correct independent of the database session's
		// timezone: Npgsql treats a Kind=Unspecified DateTime written to a
		// timestamptz column as already UTC on the client side, before the
		// value ever reaches Postgres — the session's `timezone` GUC has no
		// bearing on it.
		var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
		var result = await GetAuditPageAsync(
			adminClient, adminAccessToken, adminEmail, "identity.user.login_succeeded", page: 1, pageSize: 25, from: today);

		result.Items.ShouldContain(i => i.ActorEmail == adminEmail);
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithPreciseToTimestamp_ExcludesEventsAfterThatExactInstant()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var adminClient = CreateIsolatedClient("10.0.31.2");
		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);

		var firstLoginPage = await GetAuditPageAsync(adminClient, adminAccessToken, adminEmail, "identity.user.login_succeeded", page: 1, pageSize: 1);
		var firstLoginAt = firstLoginPage.Items[0].OccurredAt;

		await Task.Delay(50, TestContext.Current.CancellationToken);
		await LoginAsync(adminClient, adminEmail);

		// A precise (non-midnight) timestamp — e.g. the UI converting its own
		// local day boundary to a UTC instant — must act as an exact
		// inclusive upper bound rather than expanding to the whole day.
		var cutoff = firstLoginAt.AddMilliseconds(25).ToString("o");
		var result = await GetAuditPageAsync(
			adminClient, adminAccessToken, adminEmail, "identity.user.login_succeeded", page: 1, pageSize: 25, to: cutoff);

		result.TotalCount.ShouldBe(1);
		result.Items[0].OccurredAt.ShouldBe(firstLoginAt);
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithMalformedToFilter_Returns400()
	{
		var (adminEmail, _) = await SeedActiveUserAsync(Role.Admin);
		var adminClient = CreateIsolatedClient("10.0.31.3");
		var (adminAccessToken, _) = await LoginAsync(adminClient, adminEmail);

		// "To" is now a raw string bound directly from the query string (so
		// AuditToDateResolver can distinguish a bare date from a precise
		// timestamp) — a malformed value is no longer rejected by ASP.NET
		// Core's own model binding and must be caught by the validator instead.
		var response = await adminClient.SendAsync(
			AuthorizedGetRequest("/api/audit?to=not-a-date", adminAccessToken),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "M1.5UC13")]
	public async Task NonAdminGetsAuditEvents_Returns403AndDiscloseNoAuditData()
	{
		var (memberEmail, _) = await SeedActiveUserAsync();
		var client = CreateIsolatedClient("10.0.30.5");
		var (accessToken, _) = await LoginAsync(client, memberEmail);

		var response = await client.SendAsync(
			AuthorizedGetRequest("/api/audit", accessToken),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
		var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		body.ShouldNotContain("occurredAt");
	}

	[Fact]
	[Trait("AC", "M1.5UC14")]
	public async Task UnauthenticatedRequest_ReturnsAuditEvents401()
	{
		var client = CreateIsolatedClient("10.0.30.6");

		var response = await client.GetAsync("/api/audit", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
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

	private async Task<GetAuditEventsResult> GetAuditPageAsync(
		HttpClient client, string accessToken, string? actor, string eventType, int page, int pageSize, string? to = null, string? from = null)
	{
		var actorQuery = actor is null ? string.Empty : $"actor={Uri.EscapeDataString(actor)}&";
		var toQuery = to is null ? string.Empty : $"to={Uri.EscapeDataString(to)}&";
		var fromQuery = from is null ? string.Empty : $"from={Uri.EscapeDataString(from)}&";
		var path = $"/api/audit?{actorQuery}{fromQuery}{toQuery}eventType={Uri.EscapeDataString(eventType)}&page={page}&pageSize={pageSize}";
		var response = await client.SendAsync(AuthorizedGetRequest(path, accessToken), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		return (await response.Content.ReadFromJsonAsync<GetAuditEventsResult>(TestContext.Current.CancellationToken))!;
	}

	private async Task<(string Email, Guid UserId)> SeedActiveUserAsync(Role? role = null)
	{
		using var scope = fixture.Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var userRoleRepository = scope.ServiceProvider.GetRequiredService<IUserRoleRepository>();
		var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

		var email = $"audit-routes-{Guid.NewGuid()}@example.com";
		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(passwordHashService.Hash(_password));
		user.Activate();

		await unitOfWork.BeginAsync(TestContext.Current.CancellationToken);
		await userRepository.CreateAsync(user, TestContext.Current.CancellationToken);
		await userRepository.UpdatePasswordAsync(user.UserId, user.PasswordHash!.Value, clearRequiresPasswordReset: false, TestContext.Current.CancellationToken);

		if (role.HasValue)
			await userRoleRepository.CreateAsync(new UserRole(user.UserId, role.Value), TestContext.Current.CancellationToken);

		await unitOfWork.CommitAsync(TestContext.Current.CancellationToken);

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
		var refreshTokenCookie = System.Text.RegularExpressions.Regex.Match(setCookie, "__Secure-refresh_token=([^;]+)").Groups[1].Value;

		return (result!.AccessToken, refreshTokenCookie);
	}

	private async Task FailedLoginAsync(HttpClient client, string email)
	{
		var response = await client.PostAsJsonAsync(
			"/api/auth/login",
			new LoginRequest(email, "WrongPassword123!"),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}
}