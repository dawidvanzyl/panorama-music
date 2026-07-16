using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Domain.Enums;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class SessionManagementTests(ApiTestFixture fixture)
{
	private const string _password = "SessionManagementTests123!";

	public readonly JsonSerializerOptions JsonOptions = new()
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task RevokeOwnSession_OtherThanCurrent_DisappearsAndIsNoLongerUsable()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "session-management");
		var client = fixture.CreateIsolatedClient("10.0.10.1");
		await client.LoginAsync(email, _password);
		var firstAccessToken = client.AccessToken;
		var firstRefreshTokenCookie = client.RefreshTokenCookie;
		var firstSessionId = await fixture.GetSessionIdForRefreshTokenAsync(firstRefreshTokenCookie);

		await client.LoginAsync(email, _password);

		var revokeResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/auth/sessions/{firstSessionId}"),
			TestContext.Current.CancellationToken);
		revokeResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		var listResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/auth/sessions"),
			TestContext.Current.CancellationToken);
		var sessions = await listResponse.Content.ReadFromJsonAsync<List<SessionResult>>(TestContext.Current.CancellationToken);
		sessions!.ShouldNotContain(s => s.TokenId == firstSessionId);

		var refreshUsingRevokedSession = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
		refreshUsingRevokedSession.Headers.Add("Cookie", $"__Secure-refresh_token={firstRefreshTokenCookie}");
		var refreshResponse = await client.Client.SendAsync(refreshUsingRevokedSession, TestContext.Current.CancellationToken);
		refreshResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		// The revoked session's access token must stop working immediately too - not just
		// its ability to be refreshed - so a still-open tab is locked out right away rather
		// than staying signed in for up to its remaining 15-minute lifetime.
		var protectedCallWithRevokedAccessToken = await client.Client.SendAsync(
			client.AuthorizedRequest(HttpMethod.Get, "/api/auth/sessions", firstAccessToken),
			TestContext.Current.CancellationToken);
		protectedCallWithRevokedAccessToken.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task AdminRevokeSpecificUsersSession_DisappearsAndIsNoLongerUsableByThatUser()
	{
		var (adminEmail, adminUserId) = await fixture.SeedActiveUserAsync(_password, "session-management", Role.Admin);
		var (memberEmail, _) = await fixture.SeedActiveUserAsync(_password, "session-management");
		var adminClient = fixture.CreateIsolatedClient("10.0.10.2");
		var memberClient = fixture.CreateIsolatedClient("10.0.10.3");

		await adminClient.LoginAsync(adminEmail, _password);
		await memberClient.LoginAsync(memberEmail, _password);
		var memberSessionToken = memberClient.RefreshTokenCookie;
		var memberSessionId = await fixture.GetSessionIdForRefreshTokenAsync(memberSessionToken);

		var revokeResponse = await adminClient.Client.SendAsync(
			adminClient.AuthorizedDeleteRequest($"/api/auth/admin/sessions/{memberSessionId}"),
			TestContext.Current.CancellationToken);
		revokeResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		var listResponse = await adminClient.Client.SendAsync(
			adminClient.AuthorizedGetRequest("/api/auth/admin/sessions"),
			TestContext.Current.CancellationToken);
		var sessions = await listResponse.Content.ReadFromJsonAsync<List<AdminSessionResult>>(JsonOptions, TestContext.Current.CancellationToken);
		sessions!.ShouldNotContain(s => s.TokenId == memberSessionId);

		var refreshUsingRevokedSession = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
		refreshUsingRevokedSession.Headers.Add("Cookie", $"__Secure-refresh_token={memberSessionToken}");
		var refreshResponse = await memberClient.Client.SendAsync(refreshUsingRevokedSession, TestContext.Current.CancellationToken);
		refreshResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		// The revoked member's access token must stop working immediately too - not just
		// its ability to be refreshed - so an admin-initiated revocation locks the member
		// out right away rather than waiting for the token's remaining 15-minute lifetime.
		var protectedCallWithRevokedAccessToken = await memberClient.Client.SendAsync(
			memberClient.AuthorizedGetRequest("/api/auth/sessions"),
			TestContext.Current.CancellationToken);
		protectedCallWithRevokedAccessToken.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		_ = adminUserId;
	}

	[Fact]
	[Trait("AC", "M1.4UC10")]
	public async Task NonAdmin_RequestsGlobalSessionListOrRevokesAnotherUsersSession_IsDenied()
	{
		var (memberEmail, _) = await fixture.SeedActiveUserAsync(_password, "session-management");
		var client = fixture.CreateIsolatedClient("10.0.10.4");
		await client.LoginAsync(memberEmail, _password);

		var listResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/auth/admin/sessions"),
			TestContext.Current.CancellationToken);
		listResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden);

		var revokeResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/auth/admin/sessions/{Guid.NewGuid()}"),
			TestContext.Current.CancellationToken);
		revokeResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task RevokeOwnOtherSessions_EndsEveryOtherSessionImmediately_ButNeverTheCurrentOne()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "session-management");
		var client = fixture.CreateIsolatedClient("10.0.10.5");

		await client.LoginAsync(email, _password);
		var otherAccessToken1 = client.AccessToken;

		await client.LoginAsync(email, _password);
		var otherAccessToken2 = client.AccessToken;

		await client.LoginAsync(email, _password);
		var currentSessionToken = client.RefreshTokenCookie;

		var revokeResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequestWithSessionCookie("/api/auth/sessions/others", currentSessionToken),
			TestContext.Current.CancellationToken);
		revokeResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		// Both other sessions' access tokens must stop working immediately - this exercises
		// the bulk denylist insert (create_revoked_access_tokens) with more than one row,
		// proving both jtis actually persisted rather than just the first.
		var otherCall1 = await client.Client.SendAsync(
			client.AuthorizedRequest(HttpMethod.Get, "/api/auth/sessions", otherAccessToken1),
			TestContext.Current.CancellationToken);
		otherCall1.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		var otherCall2 = await client.Client.SendAsync(
			client.AuthorizedRequest(HttpMethod.Get, "/api/auth/sessions", otherAccessToken2),
			TestContext.Current.CancellationToken);
		otherCall2.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		// The revoke-all-others action must never revoke or denylist the session it was
		// invoked from.
		var currentCall = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/auth/sessions"),
			TestContext.Current.CancellationToken);
		currentCall.StatusCode.ShouldBe(HttpStatusCode.OK);
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task AdminRevokeAllGlobal_EndsEverySessionImmediately_ExceptTheAdminsOwnCurrentOne()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "session-management", Role.Admin);
		var (member1Email, _) = await fixture.SeedActiveUserAsync(_password, "session-management");
		var (member2Email, _) = await fixture.SeedActiveUserAsync(_password, "session-management");

		var adminClient = fixture.CreateIsolatedClient("10.0.10.6");
		var member1Client = fixture.CreateIsolatedClient("10.0.10.7");
		var member2Client = fixture.CreateIsolatedClient("10.0.10.8");

		await member1Client.LoginAsync(member1Email, _password);
		await member2Client.LoginAsync(member2Email, _password);
		await adminClient.LoginAsync(adminEmail, _password);

		var revokeAllResponse = await adminClient.Client.SendAsync(
			adminClient.AuthorizedDeleteRequestWithSessionCookie("/api/auth/admin/sessions/all", adminClient.RefreshTokenCookie),
			TestContext.Current.CancellationToken);
		revokeAllResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

		// Both members' access tokens must stop working immediately - this exercises the
		// bulk denylist insert (create_revoked_access_tokens) with more than one row across
		// different users, proving both jtis actually persisted rather than just the first.
		var member1Call = await member1Client.Client.SendAsync(
			member1Client.AuthorizedGetRequest("/api/auth/sessions"),
			TestContext.Current.CancellationToken);
		member1Call.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		var member2Call = await member2Client.Client.SendAsync(
			member2Client.AuthorizedGetRequest("/api/auth/sessions"),
			TestContext.Current.CancellationToken);
		member2Call.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

		// The global revoke-all action must never revoke or denylist the admin's own
		// current session.
		var adminCall = await adminClient.Client.SendAsync(
			adminClient.AuthorizedGetRequest("/api/auth/sessions"),
			TestContext.Current.CancellationToken);
		adminCall.StatusCode.ShouldBe(HttpStatusCode.OK);
	}
}