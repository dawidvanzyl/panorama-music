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
						new PracticeTimeRequest(DayType.Monday, new TimeOnly(15, 0)),
						new PracticeTimeRequest(DayType.Monday, new TimeOnly(15, 0)),
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

		var created = await CreateActivityAsync(coordinator, description, PhaseType.Senior, DayType.Wednesday, new TimeOnly(7, 30));

		var response = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest("/api/extra-curriculars"), TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var readBack = (await ReadListAsync(response, payload))
			.Single(activity => activity.ExtraCurricularId == created.ExtraCurricularId);

		ShouldlyHelpers.Satisfy(
			() => readBack.PracticeTimes.Single().Day.ShouldBe(DayType.Wednesday),
			() => readBack.PracticeTimes.Single().StartTime.ShouldBe(new TimeOnly(7, 30)),
			// No date leaks onto the wire — a value really being carried as a
			// timestamp would show up here as 1970-01-01T07:30:00.
			() => payload.ShouldContain("\"startTime\":\"07:30:00\""),
			() => payload.ShouldNotContain("1970"));
	}

	private static CreateExtraCurricularRequest RequestFor(
		string description,
		PhaseType phase,
		DayType day = DayType.Monday,
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
		DayType day = DayType.Monday,
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