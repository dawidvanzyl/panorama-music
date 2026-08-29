using PanoramaMusic.Api.Tests.Fixtures;
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
public sealed class TeacherRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "231UC1")]
	public async Task Teacher_CreateReadUpdateLifecycle_PersistsCorrectlyEndToEnd()
	{
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-lifecycle", Role.Coordinator);
		var client = fixture.CreateIsolatedClient("10.0.60.1");
		await client.LoginAsync(coordinatorEmail, _password);

		var createResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest("Alice", "Vance", IsPrivate: false)),
			TestContext.Current.CancellationToken);
		createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
		var created = await createResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var getResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/teachers/{created!.TeacherId}"), TestContext.Current.CancellationToken);
		getResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
		var fetched = await getResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var profileResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{created.TeacherId}/profile", new UpdateTeacherProfileRequest("Alicia", "Vance-Smith")),
			TestContext.Current.CancellationToken);
		profileResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

		var classificationResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{created.TeacherId}/classification", new UpdateTeacherClassificationRequest(IsPrivate: true)),
			TestContext.Current.CancellationToken);
		classificationResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

		var getAfterUpdateResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/teachers/{created.TeacherId}"), TestContext.Current.CancellationToken);
		var afterUpdate = await getAfterUpdateResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		fetched.ShouldNotBeNull();
		afterUpdate.ShouldNotBeNull();

		ShouldlyHelpers.Satisfy(
			() => created.IsActive.ShouldBeTrue(),
			() => fetched.FirstName.ShouldBe("Alice"),
			() => fetched.Surname.ShouldBe("Vance"),
			() => afterUpdate.FirstName.ShouldBe("Alicia"),
			() => afterUpdate.Surname.ShouldBe("Vance-Smith"),
			() => afterUpdate.IsPrivate.ShouldBeTrue(),
			() => afterUpdate.IsActive.ShouldBeTrue());
	}

	[Fact]
	public async Task Teacher_PrivateFlag_CapturedAndReturnedOnRecordAndListEndToEnd()
	{
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-private-flag", Role.Coordinator);
		var client = fixture.CreateIsolatedClient("10.0.60.2");
		await client.LoginAsync(coordinatorEmail, _password);

		var createResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest("Priya", "Okafor", IsPrivate: true)),
			TestContext.Current.CancellationToken);
		createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
		var created = await createResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var getResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/teachers/{created!.TeacherId}"), TestContext.Current.CancellationToken);
		var fetched = await getResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var listResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/teachers"), TestContext.Current.CancellationToken);
		var listed = await listResponse.Content.ReadFromJsonAsync<List<TeacherResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		fetched.ShouldNotBeNull();

		ShouldlyHelpers.Satisfy(
			() => created.IsPrivate.ShouldBeTrue(),
			() => fetched.IsPrivate.ShouldBeTrue(),
			() => listed.ShouldNotBeNull().ShouldContain(t => t.TeacherId == created.TeacherId && t.IsPrivate));
	}

	[Fact]
	[Trait("AC", "231UC5")]
	public async Task TeacherEndpoints_CallerWithoutCoordinatorOrBankingCoordinator_AreRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-forbidden", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.60.3");
		await client.LoginAsync(teacherEmail, _password);

		var someId = Guid.NewGuid();

		var createResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest("Alice", "Vance", IsPrivate: false)),
			TestContext.Current.CancellationToken);
		var getResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/teachers/{someId}"), TestContext.Current.CancellationToken);
		var listResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/teachers"), TestContext.Current.CancellationToken);
		var rosterResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/teachers/roster"), TestContext.Current.CancellationToken);
		var profileResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{someId}/profile", new UpdateTeacherProfileRequest("Alice", "Vance")),
			TestContext.Current.CancellationToken);
		var classificationResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{someId}/classification", new UpdateTeacherClassificationRequest(IsPrivate: false)),
			TestContext.Current.CancellationToken);

		// Admin is not a Teacher-role holder in this fixture, so unlike the Teacher
		// caller above it is refused the roster read too — the area grants it
		// nothing at all, not even the name-only projection.
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-forbidden-admin", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.60.13");
		await adminClient.LoginAsync(adminEmail, _password);

		var adminCreateResponse = await adminClient.Client.SendAsync(
			adminClient.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest("Alice", "Vance", IsPrivate: false)),
			TestContext.Current.CancellationToken);
		var adminRosterResponse = await adminClient.Client.SendAsync(
			adminClient.AuthorizedGetRequest("/api/teachers/roster"), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => getResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			// The full list stays closed — it carries the linked account email and
			// the banking details.
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			// The roster read is the one exception: a Teacher assigning a teacher to
			// a student's enrollment needs it, and seeing who teaches is not the same
			// as maintaining teachers. It serves names alone.
			() => rosterResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => profileResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => classificationResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => adminCreateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => adminRosterResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "234UC6")]
	public async Task LifecycleEndpoints_CallerWithoutBankingCoordinator_AreAllRejectedWithForbidden()
	{
		var (coordinatorOwnerEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-lifecycle-owner", Role.Coordinator);
		var owner = fixture.CreateIsolatedClient("10.0.60.4");
		await owner.LoginAsync(coordinatorOwnerEmail, _password);

		var createResponse = await owner.Client.SendAsync(
			owner.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest("Lerato", "Dube", IsPrivate: false)),
			TestContext.Current.CancellationToken);
		var teacher = await createResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-lifecycle-coordinator", Role.Coordinator);
		var coordinator = fixture.CreateIsolatedClient("10.0.60.5");
		await coordinator.LoginAsync(coordinatorEmail, _password);

		var deactivateResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPatchRequest($"/api/teachers/{teacher!.TeacherId}/deactivate", new { }),
			TestContext.Current.CancellationToken);
		var reactivateResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPatchRequest($"/api/teachers/{teacher.TeacherId}/reactivate", new { }),
			TestContext.Current.CancellationToken);
		var deleteResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedDeleteRequest($"/api/teachers/{teacher.TeacherId}"),
			TestContext.Current.CancellationToken);

		// Admin is refused too — the area grants it nothing, lifecycle included.
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-lifecycle-admin", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.60.14");
		await adminClient.LoginAsync(adminEmail, _password);

		var adminDeactivateResponse = await adminClient.Client.SendAsync(
			adminClient.AuthorizedPatchRequest($"/api/teachers/{teacher.TeacherId}/deactivate", new { }),
			TestContext.Current.CancellationToken);

		// The record is untouched by any of the refused callers — the refusal is
		// the endpoint's, not a hidden control's.
		var afterResponse = await owner.Client.SendAsync(
			owner.AuthorizedGetRequest($"/api/teachers/{teacher.TeacherId}"), TestContext.Current.CancellationToken);
		var after = await afterResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => deactivateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => reactivateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => adminDeactivateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => afterResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => after.ShouldNotBeNull().IsActive.ShouldBeTrue());
	}

	[Fact]
	[Trait("AC", "273UC5")]
	public async Task LifecycleEndpoints_BankingCoordinator_DeactivatesReactivatesAndDeletesATeacher()
	{
		var (coordinatorOwnerEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-lifecycle-bc-owner", Role.Coordinator);
		var owner = fixture.CreateIsolatedClient("10.0.60.15");
		await owner.LoginAsync(coordinatorOwnerEmail, _password);

		var createResponse = await owner.Client.SendAsync(
			owner.AuthorizedPostRequest("/api/teachers", new CreateTeacherRequest("Naledi", "Molefe", IsPrivate: false)),
			TestContext.Current.CancellationToken);
		var teacher = await createResponse.Content.ReadFromJsonAsync<TeacherResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var (bankingCoordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-lifecycle-bc", Role.BankingCoordinator);
		var bankingCoordinator = fixture.CreateIsolatedClient("10.0.60.16");
		await bankingCoordinator.LoginAsync(bankingCoordinatorEmail, _password);

		var deactivateResponse = await bankingCoordinator.Client.SendAsync(
			bankingCoordinator.AuthorizedPatchRequest($"/api/teachers/{teacher!.TeacherId}/deactivate", new { }),
			TestContext.Current.CancellationToken);
		var reactivateResponse = await bankingCoordinator.Client.SendAsync(
			bankingCoordinator.AuthorizedPatchRequest($"/api/teachers/{teacher.TeacherId}/reactivate", new { }),
			TestContext.Current.CancellationToken);
		var deactivateAgainResponse = await bankingCoordinator.Client.SendAsync(
			bankingCoordinator.AuthorizedPatchRequest($"/api/teachers/{teacher.TeacherId}/deactivate", new { }),
			TestContext.Current.CancellationToken);
		var deleteResponse = await bankingCoordinator.Client.SendAsync(
			bankingCoordinator.AuthorizedDeleteRequest($"/api/teachers/{teacher.TeacherId}"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => deactivateResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => reactivateResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => deactivateAgainResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent));
	}

	[Fact]
	[Trait("AC", "231UC6")]
	public async Task TeacherEndpoints_UnauthenticatedRequests_AreRejected()
	{
		var client = fixture.CreateClient();
		var someId = Guid.NewGuid();

		var createResponse = await client.PostAsJsonAsync(
			"/api/teachers", new CreateTeacherRequest("Alice", "Vance", IsPrivate: false), TestContext.Current.CancellationToken);
		var getResponse = await client.GetAsync($"/api/teachers/{someId}", TestContext.Current.CancellationToken);
		var listResponse = await client.GetAsync("/api/teachers", TestContext.Current.CancellationToken);
		var profileResponse = await client.PutAsJsonAsync(
			$"/api/teachers/{someId}/profile", new UpdateTeacherProfileRequest("Alice", "Vance"), TestContext.Current.CancellationToken);
		var classificationResponse = await client.PutAsJsonAsync(
			$"/api/teachers/{someId}/classification", new UpdateTeacherClassificationRequest(IsPrivate: false), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => getResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => profileResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => classificationResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized));
	}
}