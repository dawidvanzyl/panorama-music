using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

/// <summary>
/// Who may reach the extra-curricular catalogue. The roles here are deliberately
/// narrower than the Courses area's: a Teacher reads, a Coordinator maintains,
/// and the Admin role carries no rights at all.
/// </summary>
[Collection(ApiTestCollection.Name)]
public sealed class ExtraCurricularRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "275UC8")]
	public async Task GetExtraCurriculars_CallerHoldingOnlyTeacher_IsReturnedTheList()
	{
		var coordinator = await SignInAsync("extra-curriculars-read-coordinator", Role.Coordinator, "10.0.71.1");
		var created = await CreateActivityAsync(coordinator, $"Marimba Band {Guid.NewGuid()}", PhaseType.Junior);

		var teacher = await SignInAsync("extra-curriculars-read-teacher", Role.Teacher, "10.0.71.2");
		var response = await teacher.Client.SendAsync(
			teacher.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken);
		var listed = await ReadListAsync(response);

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => listed.ShouldContain(activity => activity.ExtraCurricularId == created.ExtraCurricularId),
			// The slots travel with each row, not just the activity.
			() => listed.Single(activity => activity.ExtraCurricularId == created.ExtraCurricularId)
				.PracticeTimes.Count.ShouldBe(1));
	}

	[Fact]
	[Trait("AC", "275UC9")]
	public async Task CreateExtraCurricular_CallerHoldingOnlyTeacher_IsForbiddenAndNothingIsPersisted()
	{
		var teacher = await SignInAsync("extra-curriculars-create-teacher", Role.Teacher, "10.0.71.3");
		var description = $"Teacher Attempt {Guid.NewGuid()}";

		var response = await teacher.Client.SendAsync(
			teacher.AuthorizedPostRequest("/api/extra-curriculars", RequestFor(description, PhaseType.Junior)),
			TestContext.Current.CancellationToken);

		var coordinator = await SignInAsync("extra-curriculars-create-check-coordinator", Role.Coordinator, "10.0.71.4");
		var listed = await ReadListAsync(await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => listed.ShouldNotContain(activity => activity.Description == description));
	}

	[Fact]
	[Trait("AC", "275UC10")]
	public async Task ExtraCurricularEndpoints_CallerHoldingOnlyAdmin_AreBothForbidden()
	{
		var admin = await SignInAsync("extra-curriculars-admin", Role.Admin, "10.0.71.5");

		var listResponse = await admin.Client.SendAsync(
			admin.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken);
		var createResponse = await admin.Client.SendAsync(
			admin.AuthorizedPostRequest(
				"/api/extra-curriculars", RequestFor($"Admin Attempt {Guid.NewGuid()}", PhaseType.Senior)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			// The Admin role owns nothing in this area — reading is refused too,
			// which is where it departs from every other maintenance screen.
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => createResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "275UC11")]
	public async Task ExtraCurricularEndpoints_CallerHoldingCoordinator_AreBothPermitted()
	{
		var coordinator = await SignInAsync("extra-curriculars-coordinator", Role.Coordinator, "10.0.71.6");
		var description = $"String Orchestra {Guid.NewGuid()}";

		var created = await CreateActivityAsync(coordinator, description, PhaseType.Senior);
		var listResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken);
		var listed = await ReadListAsync(listResponse);

		ShouldlyHelpers.Satisfy(
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => created.Description.ShouldBe(description),
			() => listed.ShouldContain(activity => activity.ExtraCurricularId == created.ExtraCurricularId));
	}

	[Fact]
	[Trait("AC", "275UC3")]
	public async Task CreateExtraCurricular_NoPracticeTimes_IsRejectedAndNothingIsPersisted()
	{
		var coordinator = await SignInAsync("extra-curriculars-no-slots", Role.Coordinator, "10.0.71.7");
		var description = $"Slotless {Guid.NewGuid()}";

		var response = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPostRequest(
				"/api/extra-curriculars",
				new CreateExtraCurricularRequest(description, PhaseType.Junior, [])),
			TestContext.Current.CancellationToken);

		var listed = await ReadListAsync(await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			() => listed.ShouldNotContain(activity => activity.Description == description));
	}

	[Fact]
	[Trait("AC", "275UC4")]
	public async Task CreateExtraCurricular_TwoSlotsSharingADayAndStartTime_IsRejectedAndNothingIsPersisted()
	{
		var coordinator = await SignInAsync("extra-curriculars-duplicate-slot", Role.Coordinator, "10.0.71.8");
		var description = $"Duplicated {Guid.NewGuid()}";

		var response = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPostRequest(
				"/api/extra-curriculars",
				new CreateExtraCurricularRequest(
					description,
					PhaseType.Junior,
					[
						new PracticeTimeRequest(DayOfWeek.Monday, new TimeOnly(15, 0)),
						new PracticeTimeRequest(DayOfWeek.Monday, new TimeOnly(15, 0)),
					])),
			TestContext.Current.CancellationToken);

		var listed = await ReadListAsync(await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			// A rule enforced only in the browser is not enforced.
			() => listed.ShouldNotContain(activity => activity.Description == description));
	}

	[Fact]
	[Trait("AC", "275UC7")]
	public async Task CreateExtraCurricular_TimeOfDaySlot_IsReadBackWithNoDateComponentOnTheWire()
	{
		var coordinator = await SignInAsync("extra-curriculars-slot-round-trip", Role.Coordinator, "10.0.71.9");
		var description = $"Recorder Ensemble {Guid.NewGuid()}";

		var created = await CreateActivityAsync(coordinator, description, PhaseType.Senior, DayOfWeek.Wednesday, new TimeOnly(7, 30));

		var response = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var readBack = (await ReadListAsync(response, payload))
			.Single(activity => activity.ExtraCurricularId == created.ExtraCurricularId);

		ShouldlyHelpers.Satisfy(
			() => readBack.PracticeTimes.Single().Day.ShouldBe(DayOfWeek.Wednesday),
			() => readBack.PracticeTimes.Single().StartTime.ShouldBe(new TimeOnly(7, 30)),
			// No date leaks onto the wire — a value really being carried as a
			// timestamp would show up here as 1970-01-01T07:30:00.
			() => payload.ShouldContain("\"startTime\":\"07:30:00\""),
			() => payload.ShouldNotContain("1970"));
	}

	[Fact]
	[Trait("AC", "276UC7")]
	public async Task PracticeTimeEndpoints_CallerHoldingOnlyTeacher_AreBothForbiddenAndNothingChanges()
	{
		var coordinator = await SignInAsync("practice-times-teacher-owner", Role.Coordinator, "10.0.72.1");
		var activity = await CreateActivityAsync(coordinator, $"Teacher Refused {Guid.NewGuid()}", PhaseType.Junior);

		var teacher = await SignInAsync("practice-times-teacher", Role.Teacher, "10.0.72.2");
		var addResponse = await teacher.Client.SendAsync(
			teacher.AuthorizedPostRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}/practice-times",
				new PracticeTimeRequest(DayOfWeek.Friday, new TimeOnly(12, 0))),
			TestContext.Current.CancellationToken);
		var removeResponse = await teacher.Client.SendAsync(
			teacher.AuthorizedDeleteRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}/practice-times/{activity.PracticeTimes[0].PracticeTimeId}"),
			TestContext.Current.CancellationToken);

		var readBack = await ReadActivityAsync(coordinator, activity.ExtraCurricularId);

		ShouldlyHelpers.Satisfy(
			() => addResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => removeResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			// A Teacher reads this area, so the refusal has to be of the change
			// rather than of the screen — the slots are exactly as they were.
			() => readBack.PracticeTimes.Count.ShouldBe(1),
			() => readBack.PracticeTimes[0].PracticeTimeId.ShouldBe(activity.PracticeTimes[0].PracticeTimeId));
	}

	[Fact]
	[Trait("AC", "276UC8")]
	public async Task PracticeTimeEndpoints_CallerHoldingOnlyAdmin_AreBothForbiddenAndNothingChanges()
	{
		var coordinator = await SignInAsync("practice-times-admin-owner", Role.Coordinator, "10.0.72.3");
		var activity = await CreateActivityAsync(coordinator, $"Admin Refused {Guid.NewGuid()}", PhaseType.Senior);

		var admin = await SignInAsync("practice-times-admin", Role.Admin, "10.0.72.4");
		var addResponse = await admin.Client.SendAsync(
			admin.AuthorizedPostRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}/practice-times",
				new PracticeTimeRequest(DayOfWeek.Friday, new TimeOnly(12, 0))),
			TestContext.Current.CancellationToken);
		var removeResponse = await admin.Client.SendAsync(
			admin.AuthorizedDeleteRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}/practice-times/{activity.PracticeTimes[0].PracticeTimeId}"),
			TestContext.Current.CancellationToken);

		var readBack = await ReadActivityAsync(coordinator, activity.ExtraCurricularId);

		ShouldlyHelpers.Satisfy(
			() => addResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => removeResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => readBack.PracticeTimes.Count.ShouldBe(1));
	}

	[Fact]
	[Trait("AC", "276UC9")]
	public async Task PracticeTimeEndpoints_CallerHoldingCoordinator_AddAndRemoveArePermittedAndPersisted()
	{
		var coordinator = await SignInAsync("practice-times-coordinator", Role.Coordinator, "10.0.72.5");
		var activity = await CreateActivityAsync(
			coordinator, $"Maintained {Guid.NewGuid()}", PhaseType.Junior, DayOfWeek.Monday, new TimeOnly(15, 0));

		var addResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPostRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}/practice-times",
				new PracticeTimeRequest(DayOfWeek.Wednesday, new TimeOnly(13, 0))),
			TestContext.Current.CancellationToken);
		var addPayload = await addResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		addResponse.StatusCode.ShouldBe(HttpStatusCode.Created, addPayload);
		var added = JsonSerializer.Deserialize<PracticeTimeResult>(addPayload, _jsonOptions).ShouldNotBeNull();

		var afterAdd = await ReadActivityAsync(coordinator, activity.ExtraCurricularId);

		var removeResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedDeleteRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}/practice-times/{added.PracticeTimeId}"),
			TestContext.Current.CancellationToken);
		var afterRemove = await ReadActivityAsync(coordinator, activity.ExtraCurricularId);

		ShouldlyHelpers.Satisfy(
			() => added.Day.ShouldBe(DayOfWeek.Wednesday),
			() => afterAdd.PracticeTimes.Count.ShouldBe(2),
			() => removeResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			// Both changes really landed: the added slot is gone again and the one
			// the activity opened with is untouched.
			() => afterRemove.PracticeTimes.Count.ShouldBe(1),
			() => afterRemove.PracticeTimes[0].Day.ShouldBe(DayOfWeek.Monday));
	}

	[Fact]
	[Trait("AC", "278UC8")]
	public async Task UpdateAndDelete_CallerHoldingOnlyTeacher_AreBothForbiddenAndNothingChanges()
	{
		var coordinator = await SignInAsync("ec-edit-teacher-owner", Role.Coordinator, "10.0.73.1");
		var description = $"Teacher Edit Refused {Guid.NewGuid()}";
		var activity = await CreateActivityAsync(coordinator, description, PhaseType.Junior);

		var teacher = await SignInAsync("ec-edit-teacher", Role.Teacher, "10.0.73.2");
		var updateResponse = await teacher.Client.SendAsync(
			teacher.AuthorizedPutRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}",
				new UpdateExtraCurricularRequest($"Renamed {Guid.NewGuid()}", PhaseType.Senior)),
			TestContext.Current.CancellationToken);
		var deleteResponse = await teacher.Client.SendAsync(
			teacher.AuthorizedDeleteRequest($"/api/extra-curriculars/{activity.ExtraCurricularId}"),
			TestContext.Current.CancellationToken);

		var readBack = await ReadActivityAsync(coordinator, activity.ExtraCurricularId);

		ShouldlyHelpers.Satisfy(
			() => updateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			// A Teacher reads this area, so the refusal has to be of the change
			// rather than of the screen — the activity is exactly as it was.
			() => readBack.Description.ShouldBe(description),
			() => readBack.Phase.ShouldBe(PhaseType.Junior));
	}

	[Fact]
	[Trait("AC", "278UC9")]
	public async Task UpdateCountAndDelete_CallerHoldingOnlyAdmin_AreAllForbidden()
	{
		var coordinator = await SignInAsync("ec-edit-admin-owner", Role.Coordinator, "10.0.73.3");
		var activity = await CreateActivityAsync(coordinator, $"Admin Edit Refused {Guid.NewGuid()}", PhaseType.Senior);

		var admin = await SignInAsync("ec-edit-admin", Role.Admin, "10.0.73.4");
		var updateResponse = await admin.Client.SendAsync(
			admin.AuthorizedPutRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}",
				new UpdateExtraCurricularRequest("Admin Rename", PhaseType.Junior)),
			TestContext.Current.CancellationToken);
		var countResponse = await admin.Client.SendAsync(
			admin.AuthorizedGetRequest($"/api/extra-curriculars/{activity.ExtraCurricularId}/students/count"),
			TestContext.Current.CancellationToken);
		var deleteResponse = await admin.Client.SendAsync(
			admin.AuthorizedDeleteRequest($"/api/extra-curriculars/{activity.ExtraCurricularId}"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			// The Admin role owns nothing in this area — the count is refused too.
			() => updateResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => countResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden));
	}

	[Fact]
	[Trait("AC", "278UC10")]
	public async Task UpdateAndDelete_CallerHoldingCoordinator_ArePermittedAndPersisted()
	{
		var coordinator = await SignInAsync("ec-edit-coordinator", Role.Coordinator, "10.0.73.5");
		var activity = await CreateActivityAsync(
			coordinator, $"Marimba Band {Guid.NewGuid()}", PhaseType.Junior, DayOfWeek.Monday, new TimeOnly(15, 0));
		var renamed = $"Marimba Ensemble {Guid.NewGuid()}";

		var updateResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPutRequest(
				$"/api/extra-curriculars/{activity.ExtraCurricularId}",
				new UpdateExtraCurricularRequest(renamed, PhaseType.Senior)),
			TestContext.Current.CancellationToken);
		var afterUpdate = await ReadActivityAsync(coordinator, activity.ExtraCurricularId);

		var countResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest($"/api/extra-curriculars/{activity.ExtraCurricularId}/students/count"),
			TestContext.Current.CancellationToken);
		var count = JsonSerializer.Deserialize<CountExtraCurricularStudentsResult>(
			await countResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), _jsonOptions)
			.ShouldNotBeNull();

		var deleteResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedDeleteRequest($"/api/extra-curriculars/{activity.ExtraCurricularId}"),
			TestContext.Current.CancellationToken);
		var afterDelete = await ReadListAsync(await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => updateResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => afterUpdate.Description.ShouldBe(renamed),
			() => afterUpdate.Phase.ShouldBe(PhaseType.Senior),
			// The edit left the slots exactly as they were.
			() => afterUpdate.PracticeTimes.Single().Day.ShouldBe(DayOfWeek.Monday),
			() => count.Count.ShouldBe(0),
			() => deleteResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => afterDelete.ShouldNotContain(a => a.ExtraCurricularId == activity.ExtraCurricularId));
	}

	[Fact]
	[Trait("AC", "278UC25")]
	public async Task CreateExtraCurricular_DescriptionAlreadyHeldInThatPhase_IsRefusedAndTheOtherPhaseIsNot()
	{
		var coordinator = await SignInAsync("ec-duplicate-description", Role.Coordinator, "10.0.73.6");
		var description = $"Choir {Guid.NewGuid()}";
		await CreateActivityAsync(coordinator, description, PhaseType.Junior);

		var duplicateResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPostRequest("/api/extra-curriculars", RequestFor(description, PhaseType.Junior)),
			TestContext.Current.CancellationToken);
		var otherPhaseResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPostRequest("/api/extra-curriculars", RequestFor(description, PhaseType.Senior)),
			TestContext.Current.CancellationToken);

		var listed = await ReadListAsync(await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => duplicateResponse.StatusCode.ShouldBe(HttpStatusCode.BadRequest),
			// A rule enforced only in the browser is not enforced.
			() => listed.Count(a => a.Description == description && a.Phase == PhaseType.Junior).ShouldBe(1),
			// The same description in the other phase is a legitimately different
			// activity.
			() => otherPhaseResponse.StatusCode.ShouldBe(HttpStatusCode.Created),
			() => listed.Count(a => a.Description == description && a.Phase == PhaseType.Senior).ShouldBe(1));
	}

	private static async Task<ExtraCurricularResult> ReadActivityAsync(IsolatedHttpClient client, Guid extraCurricularId)
	{
		var listed = await ReadListAsync(await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken));

		return listed.Single(activity => activity.ExtraCurricularId == extraCurricularId);
	}

	private static CreateExtraCurricularRequest RequestFor(
		string description,
		PhaseType phase,
		DayOfWeek day = DayOfWeek.Monday,
		TimeOnly? startTime = null) =>
		new(description, phase, [new PracticeTimeRequest(day, startTime ?? new TimeOnly(15, 0))]);

	private async Task<IsolatedHttpClient> SignInAsync(string emailPrefix, Role role, string sourceIp)
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, emailPrefix, role);
		var client = fixture.CreateIsolatedClient(sourceIp);
		await client.LoginAsync(email, _password);
		return client;
	}

	private static async Task<ExtraCurricularResult> CreateActivityAsync(
		IsolatedHttpClient client,
		string description,
		PhaseType phase,
		DayOfWeek day = DayOfWeek.Monday,
		TimeOnly? startTime = null)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/extra-curriculars", RequestFor(description, phase, day, startTime)),
			TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created, payload);
		return JsonSerializer.Deserialize<ExtraCurricularResult>(payload, _jsonOptions).ShouldNotBeNull();
	}

	private static async Task<List<ExtraCurricularResult>> ReadListAsync(HttpResponseMessage response, string? payload = null)
	{
		payload ??= await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		return JsonSerializer.Deserialize<List<ExtraCurricularResult>>(payload, _jsonOptions).ShouldNotBeNull();
	}
}