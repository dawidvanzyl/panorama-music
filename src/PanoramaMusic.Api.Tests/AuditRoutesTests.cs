using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Domain.Enums;
using Shouldly;
using System.Net;
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
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.30.1");
		await adminClient.LoginAsync(adminEmail, _password);

		var response = await adminClient.Client.SendAsync(
			adminClient.AuthorizedGetRequest("/api/audit"),
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
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var (memberEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes");

		var adminClient = fixture.CreateIsolatedClient("10.0.30.2");
		var memberClient = fixture.CreateIsolatedClient("10.0.30.3");
		await adminClient.LoginAsync(adminEmail, _password);

		// A failed login has no authenticated actor, so actor_email is null at
		// the top level — the attempted email only lives in the detail bag.
		// Filtering by event type alone still isolates it.
		await memberClient.FailedLoginAsync(memberEmail, "WrongPassword123!");

		var result = await adminClient.GetAuditPageAsync(actor: null, eventType: "identity.user.login_failed", page: 1, pageSize: 25);

		result.Items.ShouldContain(item => item.TargetDisplay == memberEmail && item.Outcome == "failure");
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithActorAndEventTypeFilters_ReturnsOnlyThatActorsSuccessfulLogin()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var (memberEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes");

		var adminClient = fixture.CreateIsolatedClient("10.0.30.7");
		var memberClient = fixture.CreateIsolatedClient("10.0.30.8");
		await adminClient.LoginAsync(adminEmail, _password);
		await memberClient.LoginAsync(memberEmail, _password);

		var result = await adminClient.GetAuditPageAsync(actor: memberEmail, eventType: "identity.user.login_succeeded", page: 1, pageSize: 25);
		result.TotalCount.ShouldBe(1);
		result.Items.Count.ShouldBe(1);
		result.Items[0].ActorEmail.ShouldBe(memberEmail);
		result.Items[0].EventType.ShouldBe("identity.user.login_succeeded");
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithPageSizeOne_PaginatesAcrossPagesWithoutDuplicatesOrGaps()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.30.4");
		await adminClient.LoginAsync(adminEmail, _password);

		// Two more logins on top of the one above produce 3 distinct
		// login_succeeded rows scoped to this test's unique admin email.
		await adminClient.LoginAsync(adminEmail, _password);
		await adminClient.LoginAsync(adminEmail, _password);

		var page1 = await adminClient.GetAuditPageAsync(actor: adminEmail, eventType: "identity.user.login_succeeded", page: 1, pageSize: 1);
		var page2 = await adminClient.GetAuditPageAsync(actor: adminEmail, eventType: "identity.user.login_succeeded", page: 2, pageSize: 1);
		var page3 = await adminClient.GetAuditPageAsync(actor: adminEmail, eventType: "identity.user.login_succeeded", page: 3, pageSize: 1);
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
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.31.1");
		await adminClient.LoginAsync(adminEmail, _password);

		// A bare date (no time component) — e.g. a direct API caller, or the
		// UI falling back to the documented "ISO date" contract — must still
		// be treated as inclusive of the entire UTC day it names.
		var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
		var result = await adminClient.GetAuditPageAsync(actor: adminEmail, eventType: "identity.user.login_succeeded", page: 1, pageSize: 25, to: today);

		result.Items.ShouldContain(i => i.ActorEmail == adminEmail);
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithBareDateFromFilter_IncludesEventsFromThatDayOnward()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.31.4");
		await adminClient.LoginAsync(adminEmail, _password);

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
		var result = await adminClient.GetAuditPageAsync(actor: adminEmail, eventType: "identity.user.login_succeeded", page: 1, pageSize: 25, from: today);

		result.Items.ShouldContain(i => i.ActorEmail == adminEmail);
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithPreciseToTimestamp_ExcludesEventsAfterThatExactInstant()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.31.2");
		await adminClient.LoginAsync(adminEmail, _password);

		var firstLoginPage = await adminClient.GetAuditPageAsync(actor: adminEmail, eventType: "identity.user.login_succeeded", page: 1, pageSize: 1);
		var firstLoginAt = firstLoginPage.Items[0].OccurredAt;

		await Task.Delay(50, TestContext.Current.CancellationToken);
		await adminClient.LoginAsync(adminEmail, _password);
		// A precise (non-midnight) timestamp — e.g. the UI converting its own
		// local day boundary to a UTC instant — must act as an exact
		// inclusive upper bound rather than expanding to the whole day.
		var cutoff = firstLoginAt.AddMilliseconds(25).ToString("o");
		var result = await adminClient.GetAuditPageAsync(actor: adminEmail, eventType: "identity.user.login_succeeded", page: 1, pageSize: 25, to: cutoff);

		result.TotalCount.ShouldBe(1);
		result.Items[0].OccurredAt.ShouldBe(firstLoginAt);
	}

	[Fact]
	[Trait("AC", "M1.5UC12")]
	public async Task AdminGetsAuditEvents_WithMalformedToFilter_Returns400()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.31.3");
		await adminClient.LoginAsync(adminEmail, _password);

		// "To" is now a raw string bound directly from the query string (so
		// AuditToDateResolver can distinguish a bare date from a precise
		// timestamp) — a malformed value is no longer rejected by ASP.NET
		// Core's own model binding and must be caught by the validator instead.
		var response = await adminClient.Client.SendAsync(
			adminClient.AuthorizedGetRequest("/api/audit?to=not-a-date"),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "M1.5UC13")]
	public async Task NonAdminGetsAuditEvents_Returns403AndDiscloseNoAuditData()
	{
		var (memberEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes");
		var client = fixture.CreateIsolatedClient("10.0.30.5");
		await client.LoginAsync(memberEmail, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/audit"),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
		var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		body.ShouldNotContain("occurredAt");
	}

	[Fact]
	[Trait("AC", "M1.5UC14")]
	public async Task UnauthenticatedRequest_ReturnsAuditEvents401()
	{
		var client = fixture.CreateIsolatedClient("10.0.30.6");

		var response = await client.Client.GetAsync("/api/audit", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}
}