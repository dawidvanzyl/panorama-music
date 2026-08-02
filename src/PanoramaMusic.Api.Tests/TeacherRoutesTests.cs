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
	public async Task Teacher_CreateReadUpdateLifecycle_PersistsCorrectlyEndToEnd()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "teachers-lifecycle", Role.Admin);
		var client = fixture.CreateIsolatedClient("10.0.60.1");
		await client.LoginAsync(adminEmail, _password);

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
	public async Task TeacherEndpoints_CallerWithoutAdminOrCoordinator_AreRejected()
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
		var profileResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{someId}/profile", new UpdateTeacherProfileRequest("Alice", "Vance")),
			TestContext.Current.CancellationToken);
		var classificationResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/teachers/{someId}/classification", new UpdateTeacherClassificationRequest(IsPrivate: false)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => getResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => profileResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => classificationResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
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