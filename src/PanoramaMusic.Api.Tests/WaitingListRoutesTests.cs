using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Domain.Enums;
using Shouldly;
using System.Net;
using Xunit;

namespace PanoramaMusic.Api.Tests;

/// <summary>
/// Who may reach the read-only waiting list (#292): a Teacher and a Coordinator
/// both read it, every other role is refused, and an unauthenticated caller is
/// refused outright. Capture, edit, delete and enrol arrive in later stories,
/// under their own narrower policies — this endpoint reads only.
/// </summary>
[Collection(ApiTestCollection.Name)]
public sealed class WaitingListRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	[Fact]
	[Trait("AC", "292UC7")]
	public async Task GetWaitingList_CallerHoldingTeacher_IsPermitted()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-teacher", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.73.1");
		await client.LoginAsync(email, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/waiting-list"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
	}

	[Fact]
	[Trait("AC", "292UC7")]
	public async Task GetWaitingList_CallerHoldingCoordinator_IsPermitted()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-coordinator", Role.Coordinator);
		var client = fixture.CreateIsolatedClient("10.0.73.2");
		await client.LoginAsync(email, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/waiting-list"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
	}

	[Fact]
	[Trait("AC", "292UC8")]
	public async Task GetWaitingList_CallerHoldingOnlyAdmin_IsForbidden()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-admin", Role.Admin);
		var client = fixture.CreateIsolatedClient("10.0.73.3");
		await client.LoginAsync(email, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/waiting-list"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	[Fact]
	[Trait("AC", "292UC8")]
	public async Task GetWaitingList_CallerHoldingOnlyBankingCoordinator_IsForbidden()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-banking", Role.BankingCoordinator);
		var client = fixture.CreateIsolatedClient("10.0.73.4");
		await client.LoginAsync(email, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/waiting-list"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}

	[Fact]
	[Trait("AC", "292UC9")]
	public async Task GetWaitingList_UnauthenticatedRequest_IsRejected()
	{
		var client = fixture.CreateClient();

		var response = await client.GetAsync("/api/waiting-list", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}
}