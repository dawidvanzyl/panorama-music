using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.WaitingList;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
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

	[Fact]
	[Trait("AC", "293UC9")]
	public async Task CaptureWaitingListStudent_CallerHoldingCoordinator_IsPermittedAndCreatesTheEntry()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-capture-coordinator", Role.Coordinator);
		var client = fixture.CreateIsolatedClient("10.0.73.10");
		await client.LoginAsync(email, _password);
		var structure = await GetStructureAsync(client, LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool);

		var request = ValidRequest(structure.LessonStructureId, "Amara", "Pillay");
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/waiting-list", request), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Created);
	}

	[Fact]
	[Trait("AC", "293UC10")]
	public async Task CaptureWaitingListStudent_CallerHoldingOnlyTeacher_IsForbiddenAndNothingIsCaptured()
	{
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-capture-lookup", Role.Coordinator);
		var coordinatorClient = fixture.CreateIsolatedClient("10.0.73.11");
		await coordinatorClient.LoginAsync(coordinatorEmail, _password);
		var structure = await GetStructureAsync(coordinatorClient, LessonType.Group, DurationType.HalfHour, OccurrenceType.AfterSchool);

		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-capture-teacher", Role.Teacher);
		var teacherClient = fixture.CreateIsolatedClient("10.0.73.12");
		await teacherClient.LoginAsync(teacherEmail, _password);

		var uniqueName = $"Teacher-Refused-{Guid.NewGuid():N}";
		var request = ValidRequest(structure.LessonStructureId, "Refused", uniqueName);
		var response = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPostRequest("/api/waiting-list", request), TestContext.Current.CancellationToken);

		var afterList = await coordinatorClient.Client.SendAsync(
			coordinatorClient.AuthorizedGetRequest("/api/waiting-list"), TestContext.Current.CancellationToken);
		var payload = await afterList.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => payload.ShouldNotContain(uniqueName));
	}

	[Fact]
	[Trait("AC", "293UC11")]
	public async Task CaptureWaitingListStudent_UnauthenticatedRequest_IsRejected()
	{
		var client = fixture.CreateClient();

		var response = await client.PostAsJsonAsync(
			"/api/waiting-list",
			ValidRequest(Guid.NewGuid(), "Nobody", "NoOne"),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "293UC3")]
	public async Task CaptureWaitingListStudent_UnknownLessonStructure_IsRejectedAndNoStudentIsPersisted()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-capture-unknown-structure", Role.Coordinator);
		var client = fixture.CreateIsolatedClient("10.0.73.13");
		await client.LoginAsync(email, _password);

		var uniqueName = $"Unknown-{Guid.NewGuid():N}";
		var request = ValidRequest(Guid.NewGuid(), "Structure", uniqueName);
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/waiting-list", request), TestContext.Current.CancellationToken);

		var afterList = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/waiting-list"), TestContext.Current.CancellationToken);
		var payload = await afterList.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => payload.ShouldNotContain(uniqueName));
	}

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

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

	private static CaptureWaitingListStudentRequest ValidRequest(Guid lessonStructureId, string firstName, string lastName) =>
		new(
			firstName,
			lastName,
			new DateOnly(2016, 2, 14),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English,
			lessonStructureId,
			InstrumentType.Piano,
			null);
}