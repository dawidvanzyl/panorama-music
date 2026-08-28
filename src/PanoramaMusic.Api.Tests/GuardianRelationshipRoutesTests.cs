using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.GuardianRelationships;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class GuardianRelationshipRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	[Fact]
	[Trait("AC", "214UC5")]
	public async Task MaintenanceEndpoints_CallerWithoutCoordinator_AreRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "guardian-relationships-teacher", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.50.1");
		await client.LoginAsync(teacherEmail, _password);

		var someId = Guid.NewGuid();

		var createResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/guardian-relationships", new CreateGuardianRelationshipRequest("Aunt")),
			TestContext.Current.CancellationToken);
		var renameResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/guardian-relationships/{someId}", new UpdateGuardianRelationshipRequest("Aunt")),
			TestContext.Current.CancellationToken);
		var deleteResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/guardian-relationships/{someId}"),
			TestContext.Current.CancellationToken);

		// Admin is refused too — the area grants it nothing at all.
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "guardian-relationships-admin", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.50.4");
		await adminClient.LoginAsync(adminEmail, _password);

		var adminCreateResponse = await adminClient.Client.SendAsync(
			adminClient.AuthorizedPostRequest("/api/guardian-relationships", new CreateGuardianRelationshipRequest("Aunt")),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => renameResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => adminCreateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "273UC2")]
	public async Task ReadEndpoints_Admin_AreRejectedWithForbidden()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "guardian-relationships-read-admin", Role.Admin);
		var client = fixture.CreateIsolatedClient("10.0.50.5");
		await client.LoginAsync(adminEmail, _password);

		var someId = Guid.NewGuid();

		var listResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/guardian-relationships"), TestContext.Current.CancellationToken);
		var countResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/guardian-relationships/{someId}/count"), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => countResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "214UC6")]
	public async Task MaintenanceEndpoints_UnauthenticatedRequests_AreRejected()
	{
		var client = fixture.CreateClient();
		var someId = Guid.NewGuid();

		var createResponse = await client.PostAsJsonAsync(
			"/api/guardian-relationships", new CreateGuardianRelationshipRequest("Aunt"), TestContext.Current.CancellationToken);
		var renameResponse = await client.PutAsJsonAsync(
			$"/api/guardian-relationships/{someId}", new UpdateGuardianRelationshipRequest("Aunt"), TestContext.Current.CancellationToken);
		var deleteResponse = await client.DeleteAsync(
			$"/api/guardian-relationships/{someId}", TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => renameResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized));
	}

	[Fact]
	[Trait("AC", "214UC1")]
	[Trait("AC", "214UC2")]
	[Trait("AC", "214UC3")]
	public async Task MaintenanceEndpoints_Coordinator_CreatesRenamesAndDeletesARelationshipType()
	{
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "guardian-relationships-coordinator", Role.Coordinator);
		var client = fixture.CreateIsolatedClient("10.0.50.2");
		await client.LoginAsync(coordinatorEmail, _password);

		var createResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/guardian-relationships", new CreateGuardianRelationshipRequest("Foster Parent")),
			TestContext.Current.CancellationToken);
		createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
		var created = await createResponse.Content.ReadFromJsonAsync<GuardianRelationshipResult>(TestContext.Current.CancellationToken);

		var renameResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/guardian-relationships/{created!.GuardianRelationshipId}", new UpdateGuardianRelationshipRequest("Foster Carer")),
			TestContext.Current.CancellationToken);
		renameResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

		var listResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/guardian-relationships"), TestContext.Current.CancellationToken);
		var listed = await listResponse.Content.ReadFromJsonAsync<List<GuardianRelationshipResult>>(TestContext.Current.CancellationToken);

		var deleteResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/guardian-relationships/{created.GuardianRelationshipId}"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => listed.ShouldNotBeNull().ShouldContain(r => r.GuardianRelationshipId == created.GuardianRelationshipId && r.Name == "Foster Carer"),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.OK));
	}
}