using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Application.Requests.StudentCourses;
using PanoramaMusic.Students.Application.Requests.Students;
using PanoramaMusic.Students.Application.Requests.WaitingList;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Teachers.Application.Models;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

/// <summary>
/// Who may reach the waiting list: a Teacher and a Coordinator both read it,
/// every other role is refused, and an unauthenticated caller is refused
/// outright. Every write — capturing onto the list, correcting a row, removing
/// one — is Coordinator-only, so a Teacher who can see the list can change
/// nothing on it.
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

	[Fact]
	[Trait("AC", "294UC8")]
	public async Task MaintainWaitingList_CallerHoldingCoordinator_IsPermittedToEditAndRemove()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-maintain-coordinator", Role.Coordinator);
		var client = fixture.CreateIsolatedClient("10.0.73.20");
		await client.LoginAsync(email, _password);
		var structure = await GetStructureAsync(client, LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool);
		var captured = await CaptureAsync(client, structure.LessonStructureId, "Maintain", $"Coordinator-{Guid.NewGuid():N}");

		var entryUpdate = await client.Client.SendAsync(
			client.AuthorizedPutRequest(
				$"/api/waiting-list/{captured.WaitingListEntryId}",
				new UpdateWaitingListEntryRequest(structure.LessonStructureId, InstrumentType.Guitar, "Afternoons only")),
			TestContext.Current.CancellationToken);

		var studentUpdate = await client.Client.SendAsync(
			client.AuthorizedPutRequest(
				$"/api/waiting-list/students/{captured.StudentId}",
				ValidStudentUpdate("Maintained")),
			TestContext.Current.CancellationToken);

		var removal = await client.Client.SendAsync(
			client.AuthorizedDeleteRequest($"/api/waiting-list/students/{captured.StudentId}"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => entryUpdate.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => studentUpdate.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => removal.StatusCode.ShouldBe(HttpStatusCode.OK));
	}

	[Fact]
	[Trait("AC", "294UC9")]
	public async Task MaintainWaitingList_CallerHoldingOnlyTeacher_IsForbiddenAndTheEntryIsUnchanged()
	{
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-maintain-lookup", Role.Coordinator);
		var coordinatorClient = fixture.CreateIsolatedClient("10.0.73.21");
		await coordinatorClient.LoginAsync(coordinatorEmail, _password);
		var structure = await GetStructureAsync(coordinatorClient, LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool);
		var uniqueName = $"Teacher-Refused-{Guid.NewGuid():N}";
		var captured = await CaptureAsync(coordinatorClient, structure.LessonStructureId, "Untouched", uniqueName);

		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-maintain-teacher", Role.Teacher);
		var teacherClient = fixture.CreateIsolatedClient("10.0.73.22");
		await teacherClient.LoginAsync(teacherEmail, _password);

		var entryUpdate = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPutRequest(
				$"/api/waiting-list/{captured.WaitingListEntryId}",
				new UpdateWaitingListEntryRequest(structure.LessonStructureId, InstrumentType.Guitar, "Changed by a teacher")),
			TestContext.Current.CancellationToken);

		var studentUpdate = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPutRequest(
				$"/api/waiting-list/students/{captured.StudentId}",
				ValidStudentUpdate("Renamed")),
			TestContext.Current.CancellationToken);

		var removal = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedDeleteRequest($"/api/waiting-list/students/{captured.StudentId}"),
			TestContext.Current.CancellationToken);

		var afterList = await coordinatorClient.Client.SendAsync(
			coordinatorClient.AuthorizedGetRequest("/api/waiting-list"), TestContext.Current.CancellationToken);
		var payload = await afterList.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => entryUpdate.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => studentUpdate.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => removal.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			// Still on the list under the name and instrument it was captured
			// with — the refusals changed nothing.
			() => payload.ShouldContain(uniqueName),
			() => payload.ShouldNotContain("Changed by a teacher"));
	}

	[Fact]
	[Trait("AC", "294UC7")]
	public async Task MaintainWaitingList_AnEnrolledStudentHoldingAStaleEntry_IsRefusedByBothStudentScopedRoutes()
	{
		// Enrolment does not consume the waiting-list row, so a student can hold
		// an entry and an enrollment at once. Such a student is not a waiting-list
		// student, and their record belongs to the roster — where a Coordinator is
		// refused both the update and the delete. These two routes reach a student
		// record through the waiting list, so they must resolve the same narrower
		// set, or they are a way around that refusal.
		var (coordinatorEmail, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-enrolled-coordinator", Role.Coordinator);
		var coordinatorClient = fixture.CreateIsolatedClient("10.0.73.23");
		await coordinatorClient.LoginAsync(coordinatorEmail, _password);
		var structure = await GetStructureAsync(coordinatorClient, LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool);

		var uniqueName = $"Enrolled-{Guid.NewGuid():N}";
		var captured = await CaptureAsync(coordinatorClient, structure.LessonStructureId, "Stale", uniqueName);
		var course = await CreateCourseAsync(coordinatorClient, CourseType.Instrument, 450.00m, structure.LessonStructureId);
		var teacher = await CreateTeacherAsync(coordinatorClient, "Lindiwe", $"Mabaso-{Guid.NewGuid():N}");

		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "waiting-list-enrolled-teacher", Role.Teacher);
		var teacherClient = fixture.CreateIsolatedClient("10.0.73.24");
		await teacherClient.LoginAsync(teacherEmail, _password);

		var enrollment = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedPostRequest(
				$"/api/students/{captured.StudentId}/courses",
				new EnrollStudentRequest(
					course.CourseId,
					teacher.TeacherId,
					InstrumentType.Piano,
					StepType.Step1A,
					new DateOnly(2026, 1, 15))),
			TestContext.Current.CancellationToken);
		enrollment.StatusCode.ShouldBe(HttpStatusCode.Created);

		var attemptedName = $"Renamed-{Guid.NewGuid():N}";
		var studentUpdate = await coordinatorClient.Client.SendAsync(
			coordinatorClient.AuthorizedPutRequest(
				$"/api/waiting-list/students/{captured.StudentId}", ValidStudentUpdate(attemptedName)),
			TestContext.Current.CancellationToken);

		var removal = await coordinatorClient.Client.SendAsync(
			coordinatorClient.AuthorizedDeleteRequest($"/api/waiting-list/students/{captured.StudentId}"),
			TestContext.Current.CancellationToken);

		var roster = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest("/api/students"), TestContext.Current.CancellationToken);
		var payload = await roster.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => studentUpdate.StatusCode.ShouldBe(HttpStatusCode.NotFound),
			() => removal.StatusCode.ShouldBe(HttpStatusCode.NotFound),
			// The student is still on the roster under the name they were captured
			// with: neither refusal took anything with it.
			() => payload.ShouldContain(uniqueName),
			() => payload.ShouldNotContain(attemptedName));
	}

	[Fact]
	[Trait("AC", "294UC10")]
	public async Task MaintainWaitingList_UnauthenticatedRequests_AreRejected()
	{
		var client = fixture.CreateClient();
		var entryId = Guid.NewGuid();
		var studentId = Guid.NewGuid();

		var entryUpdate = await client.PutAsJsonAsync(
			$"/api/waiting-list/{entryId}",
			new UpdateWaitingListEntryRequest(Guid.NewGuid(), InstrumentType.Piano, null),
			TestContext.Current.CancellationToken);

		var studentUpdate = await client.PutAsJsonAsync(
			$"/api/waiting-list/students/{studentId}",
			ValidStudentUpdate("Nobody"),
			TestContext.Current.CancellationToken);

		var removal = await client.DeleteAsync(
			$"/api/waiting-list/students/{studentId}", TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => entryUpdate.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => studentUpdate.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			() => removal.StatusCode.ShouldBe(HttpStatusCode.Unauthorized));
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

	private static async Task<WaitingListEntryResult> CaptureAsync(
		IsolatedHttpClient client,
		Guid lessonStructureId,
		string firstName,
		string lastName)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/waiting-list", ValidRequest(lessonStructureId, firstName, lastName)),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<WaitingListEntryResult>(payload, _jsonOptions).ShouldNotBeNull();
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

	private static async Task<TeacherResult> CreateTeacherAsync(IsolatedHttpClient client, string firstName, string surname)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new { firstName, surname, isPrivate = false }),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<TeacherResult>(payload, _jsonOptions).ShouldNotBeNull();
	}

	private static UpdateStudentRequest ValidStudentUpdate(string firstName) =>
		new(
			firstName,
			"Pillay",
			new DateOnly(2016, 2, 14),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English);

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