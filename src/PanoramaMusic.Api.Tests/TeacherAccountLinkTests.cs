using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Teachers.Application.Models;
using PanoramaMusic.Teachers.Application.Requests.Teachers;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class TeacherAccountLinkTests(ApiTestFixture fixture)
{
	private const string _password = "TeacherAccountLinkTests123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "232UC1")]
	public async Task LinkTeacherAccount_EligibleAccount_PersistsTheLinkAndReturnsTheLinkedAccount()
	{
		var client = await CreateAdminClientAsync("link-eligible", "10.0.61.1");
		var (accountEmail, accountId) = await fixture.SeedActiveUserAsync(_password, "link-eligible-account", Role.Teacher);

		var createdOnEdit = await CreateTeacherAsync(client, "Alice", "Vance");
		var linkResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{createdOnEdit.TeacherId}/account", new LinkTeacherAccountRequest(accountId)),
			TestContext.Current.CancellationToken);
		var linked = await linkResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		// Creating with a link goes through the same rules as linking afterwards.
		var (createEmail, createAccountId) = await fixture.SeedActiveUserAsync(_password, "link-at-create-account", Role.Teacher);
		var createdWithLink = await CreateTeacherAsync(client, "Priya", "Okafor", createAccountId);

		var fetched = await GetTeacherAsync(client, createdOnEdit.TeacherId);

		ShouldlyHelpers.Satisfy(
			() => linkResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => linked.ShouldNotBeNull().LinkedAccountId.ShouldBe(accountId),
			() => linked.ShouldNotBeNull().LinkedAccountEmail.ShouldBe(accountEmail),
			() => fetched.LinkedAccountId.ShouldBe(accountId),
			() => fetched.LinkedAccountEmail.ShouldBe(accountEmail),
			() => createdWithLink.LinkedAccountId.ShouldBe(createAccountId),
			() => createdWithLink.LinkedAccountEmail.ShouldBe(createEmail));
	}

	[Fact]
	[Trait("AC", "232UC2")]
	public async Task LinkTeacherAccount_AccountWithoutTheTeacherRole_IsRejectedAndNothingIsPersisted()
	{
		var client = await CreateAdminClientAsync("link-no-role", "10.0.61.2");
		var (_, accountId) = await fixture.SeedActiveUserAsync(_password, "link-no-role-account", Role.Coordinator);

		var teacher = await CreateTeacherAsync(client, "Alice", "Vance");

		var response = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{teacher.TeacherId}/account", new LinkTeacherAccountRequest(accountId)),
			TestContext.Current.CancellationToken);

		var fetched = await GetTeacherAsync(client, teacher.TeacherId);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => fetched.LinkedAccountId.ShouldBeNull());
	}

	[Fact]
	[Trait("AC", "232UC3")]
	public async Task LinkTeacherAccount_AccountAlreadyLinkedToAnotherTeacher_IsRejected()
	{
		var client = await CreateAdminClientAsync("link-already", "10.0.61.3");
		var (_, accountId) = await fixture.SeedActiveUserAsync(_password, "link-already-account", Role.Teacher);

		var firstTeacher = await CreateTeacherAsync(client, "Alice", "Vance");
		await LinkAsync(client, firstTeacher.TeacherId, accountId);

		var secondTeacher = await CreateTeacherAsync(client, "Julian", "Thorne");
		var response = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{secondTeacher.TeacherId}/account", new LinkTeacherAccountRequest(accountId)),
			TestContext.Current.CancellationToken);

		var fetchedSecond = await GetTeacherAsync(client, secondTeacher.TeacherId);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => fetchedSecond.LinkedAccountId.ShouldBeNull());
	}

	[Fact]
	[Trait("AC", "232UC4")]
	public async Task UnlinkTeacherAccount_LinkedTeacher_ClearsTheLinkAndKeepsTheTeacher()
	{
		var client = await CreateAdminClientAsync("unlink", "10.0.61.4");
		var (_, accountId) = await fixture.SeedActiveUserAsync(_password, "unlink-account", Role.Teacher);

		var teacher = await CreateTeacherAsync(client, "Alice", "Vance");
		await LinkAsync(client, teacher.TeacherId, accountId);

		var unlinkResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/teachers/{teacher.TeacherId}/account"),
			TestContext.Current.CancellationToken);

		var fetched = await GetTeacherAsync(client, teacher.TeacherId);

		ShouldlyHelpers.Satisfy(
			() => unlinkResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => fetched.LinkedAccountId.ShouldBeNull(),
			() => fetched.LinkedAccountEmail.ShouldBeNull(),
			() => fetched.FirstName.ShouldBe("Alice"),
			() => fetched.IsActive.ShouldBeTrue());
	}

	[Fact]
	[Trait("AC", "232UC5")]
	public async Task DeleteUser_AccountLinkedToATeacher_ClearsTheLinkAndTheTeacherSurvives()
	{
		var client = await CreateAdminClientAsync("delete-linked", "10.0.61.5");
		var (_, accountId) = await fixture.SeedActiveUserAsync(_password, "delete-linked-account", Role.Teacher);

		var teacher = await CreateTeacherAsync(client, "Alice", "Vance");
		await LinkAsync(client, teacher.TeacherId, accountId);

		// The account is deleted while still linked — only a deactivated account
		// may be permanently deleted, so it is deactivated first.
		await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/users/{accountId}"),
			TestContext.Current.CancellationToken);
		var deleteResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/users/{accountId}/permanent"),
			TestContext.Current.CancellationToken);

		var fetched = await GetTeacherAsync(client, teacher.TeacherId);

		ShouldlyHelpers.Satisfy(
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => fetched.LinkedAccountId.ShouldBeNull(),
			() => fetched.FirstName.ShouldBe("Alice"),
			() => fetched.IsActive.ShouldBeTrue());
	}

	[Fact]
	[Trait("AC", "232UC6")]
	public async Task UpdateUserRoles_RemovingTheTeacherRoleFromALinkedAccount_IsRejectedAndRolesAreUnchanged()
	{
		var client = await CreateAdminClientAsync("role-removal-blocked", "10.0.61.6");
		var (_, accountId) = await fixture.SeedActiveUserAsync(_password, "role-removal-blocked-account", Role.Teacher);

		var teacher = await CreateTeacherAsync(client, "Alice", "Vance");
		await LinkAsync(client, teacher.TeacherId, accountId);

		var response = await client.Client.SendAsync(
			client.AuthorizedPatchRequest($"/api/users/{accountId}", new UpdateUserRolesRequest([Role.Coordinator])),
			TestContext.Current.CancellationToken);
		var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		var roles = await GetRolesAsync(client, accountId);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => body.ShouldContain("Unlink the teacher first"),
			() => roles.ShouldBe(["Teacher"]));
	}

	[Fact]
	[Trait("AC", "232UC7")]
	public async Task UpdateUserRoles_RemovingTheTeacherRoleFromAnUnlinkedAccount_Succeeds()
	{
		var client = await CreateAdminClientAsync("role-removal-allowed", "10.0.61.7");
		var (_, accountId) = await fixture.SeedActiveUserAsync(_password, "role-removal-allowed-account", Role.Teacher);

		var response = await client.Client.SendAsync(
			client.AuthorizedPatchRequest($"/api/users/{accountId}", new UpdateUserRolesRequest([Role.Coordinator])),
			TestContext.Current.CancellationToken);

		var roles = await GetRolesAsync(client, accountId);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => roles.ShouldBe(["Coordinator"]));
	}

	[Fact]
	[Trait("AC", "232UC8")]
	public async Task TeacherAccountEndpoints_CallerWithoutAdminOrCoordinator_AreRejectedWith403()
	{
		var adminClient = await CreateAdminClientAsync("link-forbidden-admin", "10.0.61.8");
		var teacher = await CreateTeacherAsync(adminClient, "Alice", "Vance");

		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "link-forbidden", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.61.9");
		await client.LoginAsync(teacherEmail, _password);

		var linkResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{teacher.TeacherId}/account", new LinkTeacherAccountRequest(Guid.NewGuid())),
			TestContext.Current.CancellationToken);
		var unlinkResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/teachers/{teacher.TeacherId}/account"),
			TestContext.Current.CancellationToken);
		var linkableResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/teachers/linkable-accounts"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => linkResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => unlinkResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => linkableResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "234UC13")]
	public async Task LinkTeacherAccount_DeactivatedTeacher_IsRejectedWhileUnlinkingStaysAvailable()
	{
		var client = await CreateAdminClientAsync("link-deactivated-admin", "10.0.61.10");
		var (_, accountId) = await fixture.SeedActiveUserAsync(_password, "link-deactivated-account", Role.Teacher);
		var (_, secondAccountId) = await fixture.SeedActiveUserAsync(_password, "link-deactivated-second", Role.Teacher);

		var teacher = await CreateTeacherAsync(client, "Alice", "Vance");
		await LinkAsync(client, teacher.TeacherId, accountId);

		var deactivateResponse = await client.Client.SendAsync(
			client.AuthorizedPatchRequest($"/api/teachers/{teacher.TeacherId}/deactivate", new { }),
			TestContext.Current.CancellationToken);

		// Removing access from a stood-down teacher is never the wrong direction.
		var unlinkResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/teachers/{teacher.TeacherId}/account"),
			TestContext.Current.CancellationToken);

		// Granting it back is, so the endpoint refuses rather than relying on the
		// interface having disabled the control.
		var relinkResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{teacher.TeacherId}/account", new LinkTeacherAccountRequest(secondAccountId)),
			TestContext.Current.CancellationToken);

		var afterReactivate = await client.Client.SendAsync(
			client.AuthorizedPatchRequest($"/api/teachers/{teacher.TeacherId}/reactivate", new { }),
			TestContext.Current.CancellationToken);
		var linkOnceActive = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{teacher.TeacherId}/account", new LinkTeacherAccountRequest(secondAccountId)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => deactivateResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => unlinkResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => relinkResponse.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			// The bar is the teacher's state, not the account's — it lifts again
			// on reactivation.
			() => afterReactivate.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => linkOnceActive.StatusCode.ShouldBe(HttpStatusCode.OK));
	}

	private async Task<IsolatedHttpClient> CreateAdminClientAsync(string emailPrefix, string simulatedIp)
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, emailPrefix, Role.Admin);
		var client = fixture.CreateIsolatedClient(simulatedIp);
		await client.LoginAsync(adminEmail, _password);
		return client;
	}

	private static async Task<TeacherResult> CreateTeacherAsync(
		IsolatedHttpClient client,
		string firstName,
		string surname,
		Guid? linkedAccountId = null)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest(firstName, surname, IsPrivate: false, linkedAccountId)),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		return (await response.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken))!;
	}

	private static async Task<TeacherResult> GetTeacherAsync(IsolatedHttpClient client, Guid teacherId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/teachers/{teacherId}"), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);

		return (await response.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken))!;
	}

	private static async Task LinkAsync(IsolatedHttpClient client, Guid teacherId, Guid accountId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{teacherId}/account", new LinkTeacherAccountRequest(accountId)),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);
	}

	private static async Task<IList<string>> GetRolesAsync(IsolatedHttpClient client, Guid userId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/users"), TestContext.Current.CancellationToken);
		var users = await response.Content.ReadFromJsonAsync<List<UserRolesProbe>>(_jsonOptions, TestContext.Current.CancellationToken);

		return users!.Single(u => u.UserId == userId).Roles;
	}

	private sealed record UserRolesProbe(Guid UserId, IList<string> Roles);
}