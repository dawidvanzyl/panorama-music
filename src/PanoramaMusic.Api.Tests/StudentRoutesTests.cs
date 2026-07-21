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
	[Trait("AC", "5IT4")]
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
	[Trait("AC", "5IT4")]
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
	[Trait("AC", "200UC7")]
	[Trait("AC", "5IT5")]
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