using PanoramaMusic.Api.Serialization;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class CourseRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	// Cost crosses the wire as a string, so the client reads it back the same way
	// the API writes it.
	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter(), new DecimalAsStringJsonConverter() },
	};

	[Fact]
	[Trait("AC", "257UC4")]
	public async Task CreateCourse_CostWithTwoDecimalPlaces_IsReadBackAsTheSameExactDecimal()
	{
		var client = await SignInAsync("courses-cost-admin", Role.Admin, "10.0.70.1");
		var structure = await GetStructureAsync(client, LessonType.Individual, DurationType.HalfHour, OccurrenceType.AfterSchool);

		var created = await CreateCourseAsync(client, CourseType.Instrument, 450.55m, structure.LessonStructureId);

		var (listed, payload) = await GetCoursesAsync(client);
		var readBack = listed.Single(c => c.CourseId == created.CourseId);

		ShouldlyHelpers.Satisfy(
			() => created.Cost.ShouldBe(450.55m),
			() => readBack.Cost.ShouldBe(450.55m),
			// The scale survives the round trip unshifted — 450.55m, not 45055
			// scaled back, and not a rounded binary approximation.
			() => decimal.GetBits(readBack.Cost)[3].ShouldBe(2 << 16),
			// And it leaves the API as a string, so no consumer that parses JSON
			// numbers as doubles can turn it into one.
			() => payload.ShouldContain("\"cost\":\"450.55\""));
	}

	[Fact]
	[Trait("AC", "257UC3")]
	public async Task CreateCourse_NonNumericCost_IsRejectedAsABadRequest()
	{
		var client = await SignInAsync("courses-bad-cost-admin", Role.Admin, "10.0.70.2");
		var structure = await GetStructureAsync(client, LessonType.Group, DurationType.Hour, OccurrenceType.DuringSchool);

		var request = client.AuthorizedRequest(HttpMethod.Post, "/api/courses", client.AccessToken);
		request.Content = new StringContent(
			$$"""{"courseType":"Theory","cost":"not-a-number","lessonStructureId":"{{structure.LessonStructureId}}"}""",
			Encoding.UTF8,
			"application/json");

		var response = await client.Client.SendAsync(request, TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
	}

	[Fact]
	[Trait("AC", "257UC5")]
	public async Task GetCourses_ReturnsEveryCourseWithItsLessonStructureDetail()
	{
		var client = await SignInAsync("courses-list-admin", Role.Admin, "10.0.70.3");
		var groupHourDuring = await GetStructureAsync(client, LessonType.Group, DurationType.Hour, OccurrenceType.DuringSchool);
		var individualHalfAfter = await GetStructureAsync(client, LessonType.Individual, DurationType.HalfHour, OccurrenceType.AfterSchool);

		var theory = await CreateCourseAsync(client, CourseType.Theory, 120.00m, groupHourDuring.LessonStructureId);
		var instrument = await CreateCourseAsync(client, CourseType.Instrument, 850.00m, individualHalfAfter.LessonStructureId);

		var (listed, _) = await GetCoursesAsync(client);

		ShouldlyHelpers.Satisfy(
			() => listed.ShouldContain(c => c.CourseId == theory.CourseId),
			() => listed.ShouldContain(c => c.CourseId == instrument.CourseId),
			// The lesson structure detail travels with each row, not just its id.
			() => listed.Single(c => c.CourseId == theory.CourseId).LessonType.ShouldBe(LessonType.Group),
			() => listed.Single(c => c.CourseId == theory.CourseId).DurationType.ShouldBe(DurationType.Hour),
			() => listed.Single(c => c.CourseId == theory.CourseId).OccurrenceType.ShouldBe(OccurrenceType.DuringSchool),
			() => listed.Single(c => c.CourseId == instrument.CourseId).LessonType.ShouldBe(LessonType.Individual),
			() => listed.Single(c => c.CourseId == instrument.CourseId).DurationType.ShouldBe(DurationType.HalfHour),
			() => listed.Single(c => c.CourseId == instrument.CourseId).OccurrenceType.ShouldBe(OccurrenceType.AfterSchool));
	}

	[Fact]
	[Trait("AC", "257UC9")]
	public async Task CreateCourse_CallerWithoutCoordinatorOrAdmin_IsForbidden()
	{
		var adminClient = await SignInAsync("courses-forbidden-admin", Role.Admin, "10.0.70.4");
		var structure = await GetStructureAsync(adminClient, LessonType.Group, DurationType.Hour, OccurrenceType.DuringSchool);

		var teacherClient = await SignInAsync("courses-forbidden-teacher", Role.Teacher, "10.0.70.5");

		var createResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPostRequest(
				"/api/courses",
				new CreateCourseRequest(CourseType.Theory, 120.00m, structure.LessonStructureId)),
			TestContext.Current.CancellationToken);
		var listResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest("/api/courses"), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			// Reading stays open to every staff role.
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.OK));
	}

	[Fact]
	[Trait("AC", "257UC10")]
	public async Task CourseEndpoints_UnauthenticatedRequests_AreRejected()
	{
		var client = fixture.CreateClient();

		var listResponse = await client.GetAsync("/api/courses", TestContext.Current.CancellationToken);
		var createResponse = await client.PostAsJsonAsync(
			"/api/courses",
			new CreateCourseRequest(CourseType.Theory, 120.00m, Guid.NewGuid()),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized));
	}

	[Fact]
	[Trait("AC", "257UC2")]
	public async Task CreateCourse_UnknownLessonStructure_IsRejectedAndNoCourseIsPersisted()
	{
		var client = await SignInAsync("courses-unknown-structure-admin", Role.Admin, "10.0.70.6");

		var (before, _) = await GetCoursesAsync(client);
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest(
				"/api/courses",
				new CreateCourseRequest(CourseType.Theory, 120.00m, Guid.NewGuid())),
			TestContext.Current.CancellationToken);
		var (after, _) = await GetCoursesAsync(client);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => after.Count.ShouldBe(before.Count));
	}

	[Fact]
	[Trait("AC", "258UC1")]
	public async Task UpdateCourseCost_NewCost_IsPersistedAsTheSameExactDecimalAndReturned()
	{
		var client = await SignInAsync("courses-update-admin", Role.Admin, "10.0.70.7");
		var structure = await GetStructureAsync(client, LessonType.Individual, DurationType.Hour, OccurrenceType.AfterSchool);
		var created = await CreateCourseAsync(client, CourseType.Instrument, 450.50m, structure.LessonStructureId);

		var (updated, updatePayload) = await UpdateCourseCostAsync(client, created.CourseId, 499.99m);

		var (listed, _) = await GetCoursesAsync(client);
		var readBack = listed.Single(c => c.CourseId == created.CourseId);

		ShouldlyHelpers.Satisfy(
			() => updated.Cost.ShouldBe(499.99m),
			() => readBack.Cost.ShouldBe(499.99m),
			() => decimal.GetBits(readBack.Cost)[3].ShouldBe(2 << 16),
			// And it leaves the API as a string, as the created course's cost does.
			() => updatePayload.ShouldContain("\"cost\":\"499.99\""));
	}

	[Fact]
	[Trait("AC", "258UC2")]
	public async Task UpdateCourseCost_NewCost_LeavesTheCourseTypeAndLessonStructureUnchanged()
	{
		var client = await SignInAsync("courses-update-immutable-admin", Role.Admin, "10.0.70.8");
		var structure = await GetStructureAsync(client, LessonType.Group, DurationType.HalfHour, OccurrenceType.DuringSchool);
		var created = await CreateCourseAsync(client, CourseType.Theory, 120.00m, structure.LessonStructureId);

		var (updated, _) = await UpdateCourseCostAsync(client, created.CourseId, 130.00m);

		ShouldlyHelpers.Satisfy(
			() => updated.CourseType.ShouldBe(CourseType.Theory),
			() => updated.LessonStructureId.ShouldBe(structure.LessonStructureId),
			() => updated.LessonType.ShouldBe(LessonType.Group),
			() => updated.DurationType.ShouldBe(DurationType.HalfHour),
			() => updated.OccurrenceType.ShouldBe(OccurrenceType.DuringSchool));
	}

	[Fact]
	[Trait("AC", "258UC3")]
	public async Task UpdateCourseCost_InvalidCost_IsRejectedAndTheStoredCostIsUnchanged()
	{
		var client = await SignInAsync("courses-update-bad-cost-admin", Role.Admin, "10.0.70.9");
		var structure = await GetStructureAsync(client, LessonType.Individual, DurationType.HalfHour, OccurrenceType.DuringSchool);
		var created = await CreateCourseAsync(client, CourseType.Theory, 120.00m, structure.LessonStructureId);

		var nonNumeric = await SendRawUpdateAsync(client, created.CourseId, """{"cost":"not-a-number"}""");
		var negative = await SendRawUpdateAsync(client, created.CourseId, """{"cost":"-1.00"}""");
		var overPrecise = await SendRawUpdateAsync(client, created.CourseId, """{"cost":"120.005"}""");

		var (listed, _) = await GetCoursesAsync(client);

		ShouldlyHelpers.Satisfy(
			() => nonNumeric.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => negative.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => overPrecise.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => listed.Single(c => c.CourseId == created.CourseId).Cost.ShouldBe(120.00m));
	}

	[Fact]
	[Trait("AC", "258UC4")]
	public async Task UpdateCourseCost_UnknownCourseId_IsRefusedAsNotFound()
	{
		var client = await SignInAsync("courses-update-missing-admin", Role.Admin, "10.0.70.10");

		var response = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/courses/{Guid.NewGuid()}", new UpdateCourseRequest(120.00m)),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	[Trait("AC", "258UC5")]
	public async Task DeleteCourse_ExistingCourse_RemovesItFromTheCourseList()
	{
		var client = await SignInAsync("courses-delete-admin", Role.Admin, "10.0.70.11");
		var structure = await GetStructureAsync(client, LessonType.Group, DurationType.Hour, OccurrenceType.AfterSchool);
		var created = await CreateCourseAsync(client, CourseType.G2Recorder, 200.00m, structure.LessonStructureId);

		var response = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/courses/{created.CourseId}"),
			TestContext.Current.CancellationToken);

		var (listed, _) = await GetCoursesAsync(client);
		var structuresAfter = await GetStructureAsync(client, LessonType.Group, DurationType.Hour, OccurrenceType.AfterSchool);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => listed.ShouldNotContain(c => c.CourseId == created.CourseId),
			// The seeded structure the course referenced is never orphaned by the delete.
			() => structuresAfter.LessonStructureId.ShouldBe(structure.LessonStructureId));
	}

	[Fact]
	[Trait("AC", "258UC6")]
	public async Task DeleteCourse_UnknownCourseId_IsRefusedAsNotFound()
	{
		var client = await SignInAsync("courses-delete-missing-admin", Role.Admin, "10.0.70.12");

		var response = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/courses/{Guid.NewGuid()}"),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
	}

	[Fact]
	[Trait("AC", "258UC7")]
	public async Task CourseMaintenance_CallerWithoutCoordinatorOrAdmin_IsForbiddenAndNothingChanges()
	{
		var adminClient = await SignInAsync("courses-maintain-forbidden-admin", Role.Admin, "10.0.70.13");
		var structure = await GetStructureAsync(adminClient, LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool);
		var created = await CreateCourseAsync(adminClient, CourseType.GREEnrichment, 300.00m, structure.LessonStructureId);

		var teacherClient = await SignInAsync("courses-maintain-forbidden-teacher", Role.Teacher, "10.0.70.14");

		var updateResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPutRequest($"/api/courses/{created.CourseId}", new UpdateCourseRequest(999.00m)),
			TestContext.Current.CancellationToken);
		var deleteResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedDeleteRequest($"/api/courses/{created.CourseId}"),
			TestContext.Current.CancellationToken);

		var (listed, _) = await GetCoursesAsync(adminClient);

		ShouldlyHelpers.Satisfy(
			() => updateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => listed.Single(c => c.CourseId == created.CourseId).Cost.ShouldBe(300.00m));
	}

	[Fact]
	[Trait("AC", "258UC8")]
	public async Task CourseMaintenance_UnauthenticatedRequests_AreRejected()
	{
		var client = fixture.CreateClient();
		var courseId = Guid.NewGuid();

		var updateResponse = await client.PutAsJsonAsync(
			$"/api/courses/{courseId}", new UpdateCourseRequest(120.00m), TestContext.Current.CancellationToken);
		var deleteResponse = await client.DeleteAsync($"/api/courses/{courseId}", TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => updateResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized));
	}

	private async Task<IsolatedHttpClient> SignInAsync(string emailPrefix, Role role, string sourceIp)
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, emailPrefix, role);
		var client = fixture.CreateIsolatedClient(sourceIp);
		await client.LoginAsync(email, _password);
		return client;
	}

	private static async Task<LessonStructureResult> GetStructureAsync(
		IsolatedHttpClient client,
		LessonType lessonType,
		DurationType durationType,
		OccurrenceType occurrenceType)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/lesson-structures"), TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var structures = JsonSerializer.Deserialize<List<LessonStructureResult>>(payload, _jsonOptions).ShouldNotBeNull();

		return structures.Single(s =>
			s.LessonType == lessonType && s.DurationType == durationType && s.OccurrenceType == occurrenceType);
	}

	private static async Task<CourseResult> CreateCourseAsync(
		IsolatedHttpClient client,
		CourseType courseType,
		decimal cost,
		Guid lessonStructureId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/courses", new CreateCourseRequest(courseType, cost, lessonStructureId)),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<CourseResult>(payload, _jsonOptions).ShouldNotBeNull();
	}

	/// <summary>The updated course and the raw payload it came from.</summary>
	private static async Task<(CourseResult Course, string Payload)> UpdateCourseCostAsync(
		IsolatedHttpClient client,
		Guid courseId,
		decimal cost)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPutRequest($"/api/courses/{courseId}", new UpdateCourseRequest(cost)),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return (JsonSerializer.Deserialize<CourseResult>(payload, _jsonOptions).ShouldNotBeNull(), payload);
	}

	/// <summary>
	/// Sends the update body verbatim, so a cost the request record could not
	/// even hold — a non-numeric one — reaches the endpoint as written.
	/// </summary>
	private static Task<HttpResponseMessage> SendRawUpdateAsync(IsolatedHttpClient client, Guid courseId, string body)
	{
		var request = client.AuthorizedRequest(HttpMethod.Put, $"/api/courses/{courseId}", client.AccessToken);
		request.Content = new StringContent(body, Encoding.UTF8, "application/json");

		return client.Client.SendAsync(request, TestContext.Current.CancellationToken);
	}

	/// <summary>The deserialised list and the raw payload it came from.</summary>
	private static async Task<(List<CourseResult> Courses, string Payload)> GetCoursesAsync(IsolatedHttpClient client)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/courses"), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return (JsonSerializer.Deserialize<List<CourseResult>>(payload, _jsonOptions).ShouldNotBeNull(), payload);
	}
}