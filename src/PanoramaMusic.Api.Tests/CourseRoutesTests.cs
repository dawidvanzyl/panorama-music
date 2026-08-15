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

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "257UC4")]
	public async Task CreateCourse_CostWithTwoDecimalPlaces_IsReadBackAsTheSameExactDecimal()
	{
		var client = await SignInAsync("courses-cost-admin", Role.Admin, "10.0.70.1");
		var structure = await GetStructureAsync(client, LessonType.Individual, DurationType.HalfHour, OccurrenceType.AfterSchool);

		var created = await CreateCourseAsync(client, CourseType.Instrument, 450.55m, structure.LessonStructureId);

		var listed = await GetCoursesAsync(client, $"?courseType={CourseType.Instrument}");
		var readBack = listed.Single(c => c.CourseId == created.CourseId);

		ShouldlyHelpers.Satisfy(
			() => created.Cost.ShouldBe(450.55m),
			() => readBack.Cost.ShouldBe(450.55m),
			// The scale survives the round trip unshifted — 450.55m, not 45055
			// scaled back, and not a rounded binary approximation.
			() => decimal.GetBits(readBack.Cost)[3].ShouldBe(2 << 16));
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
	[Trait("AC", "257UC6")]
	[Trait("AC", "257UC7")]
	public async Task GetCourses_Filters_NarrowTheListAndCombine()
	{
		var client = await SignInAsync("courses-filters-admin", Role.Admin, "10.0.70.3");
		var groupHourDuring = await GetStructureAsync(client, LessonType.Group, DurationType.Hour, OccurrenceType.DuringSchool);
		var individualHalfAfter = await GetStructureAsync(client, LessonType.Individual, DurationType.HalfHour, OccurrenceType.AfterSchool);

		var theory = await CreateCourseAsync(client, CourseType.Theory, 120.00m, groupHourDuring.LessonStructureId);
		var instrument = await CreateCourseAsync(client, CourseType.Instrument, 850.00m, individualHalfAfter.LessonStructureId);

		var unfiltered = await GetCoursesAsync(client, string.Empty);
		var byCourseType = await GetCoursesAsync(client, $"?courseType={CourseType.Theory}");
		var combined = await GetCoursesAsync(
			client,
			$"?lessonType={LessonType.Individual}&durationType={DurationType.HalfHour}&occurrenceType={OccurrenceType.AfterSchool}");

		ShouldlyHelpers.Satisfy(
			() => unfiltered.ShouldContain(c => c.CourseId == theory.CourseId),
			() => unfiltered.ShouldContain(c => c.CourseId == instrument.CourseId),
			// The lesson structure detail travels with each row, not just its id.
			() => unfiltered.Single(c => c.CourseId == theory.CourseId).LessonType.ShouldBe(LessonType.Group),
			() => unfiltered.Single(c => c.CourseId == theory.CourseId).DurationType.ShouldBe(DurationType.Hour),
			() => unfiltered.Single(c => c.CourseId == theory.CourseId).OccurrenceType.ShouldBe(OccurrenceType.DuringSchool),
			() => byCourseType.ShouldAllBe(c => c.CourseType == CourseType.Theory),
			() => byCourseType.ShouldContain(c => c.CourseId == theory.CourseId),
			() => combined.ShouldContain(c => c.CourseId == instrument.CourseId),
			() => combined.ShouldNotContain(c => c.CourseId == theory.CourseId));
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

		var before = await GetCoursesAsync(client, string.Empty);
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest(
				"/api/courses",
				new CreateCourseRequest(CourseType.Theory, 120.00m, Guid.NewGuid())),
			TestContext.Current.CancellationToken);
		var after = await GetCoursesAsync(client, string.Empty);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => after.Count.ShouldBe(before.Count));
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

	private static async Task<List<CourseResult>> GetCoursesAsync(IsolatedHttpClient client, string query)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/courses{query}"), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<List<CourseResult>>(payload, _jsonOptions).ShouldNotBeNull();
	}
}