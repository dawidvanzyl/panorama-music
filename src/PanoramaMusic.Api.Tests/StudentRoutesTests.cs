using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class StudentRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "200UC8")]
	public async Task GetStudents_MultipleStudents_ReturnsFullRosterOrderedByGradeClassLastNameFirstName()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-roster", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.1");
		await client.LoginAsync(teacherEmail, _password);

		await CreateStudentAsync(client, "Julian", "Thorne", GradeType.Grade5, ClassType.E1, PhaseType.Senior);
		await CreateStudentAsync(client, "Alice", "Vance", GradeType.Grade4, ClassType.A1, PhaseType.Junior);
		await CreateStudentAsync(client, "Priya", "Okafor", GradeType.Grade4, ClassType.A1, PhaseType.Junior);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/students"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var results = await response.Content.ReadFromJsonAsync<List<StudentResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		results.ShouldNotBeNull();
		var createdNames = new HashSet<(string, string)> { ("Julian", "Thorne"), ("Alice", "Vance"), ("Priya", "Okafor") };
		var names = results.Select(s => (s.FirstName, s.LastName)).Where(createdNames.Contains).ToList();
		names.ShouldBe([("Priya", "Okafor"), ("Alice", "Vance"), ("Julian", "Thorne")]);
	}

	[Fact]
	[Trait("AC", "200UC6")]
	public async Task CreateStudent_GradeOutsideDefinedEnumeration_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-invalid-enum", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.2");
		await client.LoginAsync(teacherEmail, _password);

		var request = new HttpRequestMessage(HttpMethod.Post, "/api/students")
		{
			Content = JsonContent.Create(new
			{
				FirstName = "Alice",
				LastName = "Vance",
				DateOfBirth = "2014-05-12",
				Grade = "NotARealGrade",
				Class = "A1",
				Phase = "Junior",
				Language = "English",
			}),
		};
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", client.AccessToken);

		var response = await client.Client.SendAsync(request, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "200UC6")]
	public async Task UpdateStudent_GradeOutsideDefinedEnumeration_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-invalid-enum-update", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.11");
		await client.LoginAsync(teacherEmail, _password);

		var createResponse = await CreateStudentAsync(client, "Zola", "Mabaso", GradeType.Grade2, ClassType.A1, PhaseType.Junior);
		var created = await createResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var request = new HttpRequestMessage(HttpMethod.Put, $"/api/students/{created!.StudentId}")
		{
			Content = JsonContent.Create(new
			{
				FirstName = "Zola",
				LastName = "Mabaso",
				DateOfBirth = "2014-05-12",
				Grade = "NotARealGrade",
				Class = "A1",
				Phase = "Junior",
				Language = "English",
			}),
		};
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", client.AccessToken);

		var response = await client.Client.SendAsync(request, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "206UC1")]
	public async Task CreateStudent_PrivateGradeWithoutClassOrPhase_PersistsSuccessfully()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-private-create", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.30");
		await client.LoginAsync(teacherEmail, _password);

		var request = new CreateStudentRequest("Zanele", "Mokoena", new DateOnly(2014, 5, 12), GradeType.Private, null, null, Language.English);
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/students", request), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Created);
		var created = await response.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);
		created!.Class.ShouldBeNull();
		created.Phase.ShouldBeNull();
	}

	[Fact]
	[Trait("AC", "206UC2")]
	public async Task CreateStudent_PrivateGradeWithClassOrPhase_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-private-create-invalid", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.31");
		await client.LoginAsync(teacherEmail, _password);

		var request = new CreateStudentRequest("Zanele", "Mokoena", new DateOnly(2014, 5, 12), GradeType.Private, ClassType.A1, PhaseType.Junior, Language.English);
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/students", request), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "206UC3")]
	public async Task CreateStudent_NonPrivateGradeWithoutClassOrPhase_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-nonprivate-create-invalid", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.32");
		await client.LoginAsync(teacherEmail, _password);

		var request = new CreateStudentRequest("Zanele", "Mokoena", new DateOnly(2014, 5, 12), GradeType.Grade4, null, null, Language.English);
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/students", request), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "206UC4")]
	public async Task UpdateStudent_ExistingPrivateGradeStudentWithClassOrPhase_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-private-update-invalid", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.33");
		await client.LoginAsync(teacherEmail, _password);

		var createRequest = new CreateStudentRequest("Karabo", "Sithole", new DateOnly(2014, 5, 12), GradeType.Private, null, null, Language.English);
		var createResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/students", createRequest), TestContext.Current.CancellationToken);
		var created = await createResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var updateRequest = new UpdateStudentRequest(
			created!.FirstName, created.LastName, created.DateOfBirth, GradeType.Private, ClassType.A1, PhaseType.Junior, created.Language);
		var updateResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/students/{created.StudentId}", updateRequest), TestContext.Current.CancellationToken);

		updateResponse.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "206UC5")]
	public async Task UpdateStudent_ExistingNonPrivateGradeStudentWithoutClassOrPhase_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-nonprivate-update-invalid", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.34");
		await client.LoginAsync(teacherEmail, _password);

		var createResponse = await CreateStudentAsync(client, "Karabo", "Sithole", GradeType.Grade4, ClassType.A1, PhaseType.Junior);
		var created = await createResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var updateRequest = new UpdateStudentRequest(
			created!.FirstName, created.LastName, created.DateOfBirth, GradeType.Grade4, null, null, created.Language);
		var updateResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/students/{created.StudentId}", updateRequest), TestContext.Current.CancellationToken);

		updateResponse.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "200UC7")]
	public async Task GetStudents_UnauthenticatedRequest_IsRejected()
	{
		var response = await fixture.CreateClient().GetAsync("/api/students", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "200UC1")]
	public async Task CreateStudent_ValidRequest_PersistsAndReturnsStudentViaApi()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-create-api", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.3");
		await client.LoginAsync(teacherEmail, _password);

		var response = await CreateStudentAsync(client, "Nadia", "Okafor", GradeType.Grade3, ClassType.A2, PhaseType.Junior);

		response.StatusCode.ShouldBe(HttpStatusCode.Created);
		var created = await response.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var getResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/students/{created!.StudentId}"), TestContext.Current.CancellationToken);
		getResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
	}

	[Fact]
	[Trait("AC", "200UC3")]
	public async Task UpdateStudent_ValidRequest_PersistsChangesViaApi()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-update-api", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.12");
		await client.LoginAsync(teacherEmail, _password);

		var createResponse = await CreateStudentAsync(client, "Thandiwe", "Nkosi", GradeType.Grade3, ClassType.A1, PhaseType.Junior);
		var created = await createResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var updateRequest = new UpdateStudentRequest(
			created!.FirstName, created.LastName, created.DateOfBirth, GradeType.Grade4, created.Class, created.Phase, created.Language);
		var updateResponse = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/students/{created.StudentId}", updateRequest), TestContext.Current.CancellationToken);

		updateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
		var updated = await updateResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);
		updated!.Grade.ShouldBe(GradeType.Grade4);

		var getResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/students/{created.StudentId}"), TestContext.Current.CancellationToken);
		var fetched = await getResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);
		fetched!.Grade.ShouldBe(GradeType.Grade4);
	}

	[Fact]
	[Trait("AC", "200UC4")]
	public async Task DeleteStudent_ExistingStudent_RemovesItFromSubsequentListing()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "students-delete-api", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.4");
		await client.LoginAsync(teacherEmail, _password);

		var createResponse = await CreateStudentAsync(client, "Priya", "Rao", GradeType.Grade6, ClassType.E2, PhaseType.Senior);
		var created = await createResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var deleteResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/students/{created!.StudentId}"), TestContext.Current.CancellationToken);
		deleteResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

		var getResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/students/{created.StudentId}"), TestContext.Current.CancellationToken);
		getResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	[Trait("AC", "201UC1")]
	[Trait("AC", "201UC2")]
	public async Task AddSibling_TwoDistinctStudents_RecordsBidirectionally()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "siblings-add-api", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.20");
		await client.LoginAsync(teacherEmail, _password);

		var aliceResponse = await CreateStudentAsync(client, "Kagiso", "Dlamini", GradeType.Grade4, ClassType.A1, PhaseType.Junior);
		var alice = await aliceResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);
		var julianResponse = await CreateStudentAsync(client, "Ruth", "Ferreira", GradeType.Grade5, ClassType.E1, PhaseType.Senior);
		var julian = await julianResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var addResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest($"/api/students/{alice!.StudentId}/siblings", new { SiblingId = julian!.StudentId }),
			TestContext.Current.CancellationToken);
		addResponse.StatusCode.ShouldBe(HttpStatusCode.Created);

		var aliceSiblingsResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/students/{alice.StudentId}/siblings"), TestContext.Current.CancellationToken);
		var aliceSiblings = await aliceSiblingsResponse.Content.ReadFromJsonAsync<List<StudentResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		var julianSiblingsResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/students/{julian.StudentId}/siblings"), TestContext.Current.CancellationToken);
		var julianSiblings = await julianSiblingsResponse.Content.ReadFromJsonAsync<List<StudentResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		aliceSiblings.ShouldNotBeNull();
		julianSiblings.ShouldNotBeNull();
		aliceSiblings.ShouldContain(s => s.StudentId == julian.StudentId);
		julianSiblings.ShouldContain(s => s.StudentId == alice.StudentId);
	}

	[Fact]
	[Trait("AC", "201UC3")]
	public async Task RemoveSibling_ExistingLink_RemovesLinkInBothDirections()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "siblings-remove-api", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.21");
		await client.LoginAsync(teacherEmail, _password);

		var aliceResponse = await CreateStudentAsync(client, "Sipho", "Ndlovu", GradeType.Grade3, ClassType.A2, PhaseType.Junior);
		var alice = await aliceResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);
		var julianResponse = await CreateStudentAsync(client, "Amara", "Botha", GradeType.Grade3, ClassType.A2, PhaseType.Junior);
		var julian = await julianResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		await client.Client.SendAsync(
			client.AuthorizedPostRequest($"/api/students/{alice!.StudentId}/siblings", new { SiblingId = julian!.StudentId }),
			TestContext.Current.CancellationToken);

		var removeResponse = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/students/{alice.StudentId}/siblings/{julian.StudentId}"), TestContext.Current.CancellationToken);
		removeResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

		var aliceSiblingsResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/students/{alice.StudentId}/siblings"), TestContext.Current.CancellationToken);
		var aliceSiblings = await aliceSiblingsResponse.Content.ReadFromJsonAsync<List<StudentResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		var julianSiblingsResponse = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/students/{julian.StudentId}/siblings"), TestContext.Current.CancellationToken);
		var julianSiblings = await julianSiblingsResponse.Content.ReadFromJsonAsync<List<StudentResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		aliceSiblings.ShouldNotBeNull();
		julianSiblings.ShouldNotBeNull();
		aliceSiblings.ShouldNotContain(s => s.StudentId == julian.StudentId);
		julianSiblings.ShouldNotContain(s => s.StudentId == alice.StudentId);
	}

	[Fact]
	[Trait("AC", "201UC4")]
	public async Task AddSibling_SameStudentAsSibling_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "siblings-self-link-api", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.22");
		await client.LoginAsync(teacherEmail, _password);

		var createResponse = await CreateStudentAsync(client, "Lerato", "Khumalo", GradeType.Grade3, ClassType.A2, PhaseType.Junior);
		var created = await createResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var addResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest($"/api/students/{created!.StudentId}/siblings", new { SiblingId = created.StudentId }),
			TestContext.Current.CancellationToken);

		addResponse.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	public async Task AddSibling_AlreadyLinkedPair_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "siblings-duplicate-api", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.24");
		await client.LoginAsync(teacherEmail, _password);

		var aliceResponse = await CreateStudentAsync(client, "Naledi", "Radebe", GradeType.Grade3, ClassType.A1, PhaseType.Junior);
		var alice = await aliceResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);
		var julianResponse = await CreateStudentAsync(client, "Thabo", "Zulu", GradeType.Grade3, ClassType.A1, PhaseType.Junior);
		var julian = await julianResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		await client.Client.SendAsync(
			client.AuthorizedPostRequest($"/api/students/{alice!.StudentId}/siblings", new { SiblingId = julian!.StudentId }),
			TestContext.Current.CancellationToken);

		var secondAddResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest($"/api/students/{alice.StudentId}/siblings", new { SiblingId = julian.StudentId }),
			TestContext.Current.CancellationToken);

		secondAddResponse.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "201UC5")]
	public async Task AddSibling_NonExistentSiblingId_IsRejected()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "siblings-unknown-id-api", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.40.23");
		await client.LoginAsync(teacherEmail, _password);

		var createResponse = await CreateStudentAsync(client, "Kabelo", "Molefe", GradeType.Grade3, ClassType.A1, PhaseType.Junior);
		var created = await createResponse.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken);

		var addResponse = await client.Client.SendAsync(
			client.AuthorizedPostRequest($"/api/students/{created!.StudentId}/siblings", new { SiblingId = Guid.NewGuid() }),
			TestContext.Current.CancellationToken);

		addResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	[Trait("AC", "201UC6")]
	public async Task GetSiblings_UnauthenticatedRequest_IsRejected()
	{
		var response = await fixture.CreateClient().GetAsync($"/api/students/{Guid.NewGuid()}/siblings", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	private static Task<HttpResponseMessage> CreateStudentAsync(
		IsolatedHttpClient client,
		string firstName,
		string lastName,
		GradeType grade,
		ClassType @class,
		PhaseType phase)
	{
		var request = new CreateStudentRequest(firstName, lastName, new DateOnly(2014, 5, 12), grade, @class, phase, Language.English);
		return client.Client.SendAsync(client.AuthorizedPostRequest("/api/students", request), TestContext.Current.CancellationToken);
	}
}