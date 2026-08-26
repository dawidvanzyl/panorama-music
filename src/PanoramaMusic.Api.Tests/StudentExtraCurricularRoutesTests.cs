using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Application.Requests.ExtraCurriculars;
using PanoramaMusic.Students.Application.Requests.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Requests.Students;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

/// <summary>
/// Who may maintain a student's extra-curricular participation. This surface is
/// the Student modal, so it carries the Student area's boundary rather than the
/// Extra-Curriculars Management page's — which means the roles here deliberately
/// differ from <see cref="ExtraCurricularRoutesTests"/>'s, in both directions.
/// </summary>
[Collection(ApiTestCollection.Name)]
public sealed class StudentExtraCurricularRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "277UC10")]
	public async Task StudentExtraCurricularEndpoints_CallerWhoMayNotMaintainStudentRecords_AreRefusedAndNothingIsPersisted()
	{
		var admin = await SignInAsync("student-ec-refusal-admin", Role.Admin, "10.0.73.1");
		var coordinator = await SignInAsync("student-ec-refusal-coordinator", Role.Coordinator, "10.0.73.2");
		var student = await CreateStudentAsync(admin, "Thandi", "Nkosi", PhaseType.Junior);
		var activity = await CreateActivityAsync(coordinator, $"Marimba Band {Guid.NewGuid()}", PhaseType.Junior);
		var held = await CreateActivityAsync(coordinator, $"Choir {Guid.NewGuid()}", PhaseType.Junior);
		await AssignAsync(admin, student.StudentId, held.ExtraCurricularId);

		// A Coordinator maintains the activity catalogue but not student records,
		// so this area is closed to them — real, existing resources throughout, so
		// a 404 could not stand in for the refusal.
		var listResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest($"/api/students/{student.StudentId}/extra-curriculars"),
			TestContext.Current.CancellationToken);
		var assignableResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedGetRequest($"/api/students/{student.StudentId}/extra-curriculars/assignable"),
			TestContext.Current.CancellationToken);
		var assignResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedPostRequest(
				$"/api/students/{student.StudentId}/extra-curriculars",
				new AssignExtraCurricularRequest(activity.ExtraCurricularId)),
			TestContext.Current.CancellationToken);
		var removeResponse = await coordinator.Client.SendAsync(
			coordinator.AuthorizedDeleteRequest(
				$"/api/students/{student.StudentId}/extra-curriculars/{held.ExtraCurricularId}"),
			TestContext.Current.CancellationToken);

		var anonymous = fixture.CreateClient();
		var anonymousResponse = await anonymous.GetAsync(
			$"/api/students/{student.StudentId}/extra-curriculars", TestContext.Current.CancellationToken);

		var assigned = await ReadAssignedAsync(admin, student.StudentId);

		ShouldlyHelpers.Satisfy(
			() => listResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => assignableResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => assignResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => removeResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			// No session at all is refused earlier still, and as 401 rather than 403.
			() => anonymousResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized),
			// Nothing the refused calls asked for happened: the attempted assignment
			// was not created, and the one the student already held was not removed.
			() => assigned.Select(entry => entry.ExtraCurricularId).ShouldBe([held.ExtraCurricularId]));
	}

	[Fact]
	[Trait("AC", "277UC10")]
	public async Task StudentExtraCurricularEndpoints_CallerHoldingOnlyTeacher_MayMaintainTheStudentsAssignments()
	{
		var admin = await SignInAsync("student-ec-teacher-admin", Role.Admin, "10.0.73.3");
		var coordinator = await SignInAsync("student-ec-teacher-coordinator", Role.Coordinator, "10.0.73.4");
		var student = await CreateStudentAsync(admin, "Sipho", "Ndlovu", PhaseType.Senior);
		var activity = await CreateActivityAsync(coordinator, $"Senior Band {Guid.NewGuid()}", PhaseType.Senior);

		// A Teacher already maintains student records elsewhere, and this endpoint
		// carries that same boundary — the mirror image of the practice-time
		// endpoints, which refuse them.
		var teacher = await SignInAsync("student-ec-teacher", Role.Teacher, "10.0.73.5");
		var assignResponse = await teacher.Client.SendAsync(
			teacher.AuthorizedPostRequest(
				$"/api/students/{student.StudentId}/extra-curriculars",
				new AssignExtraCurricularRequest(activity.ExtraCurricularId)),
			TestContext.Current.CancellationToken);
		var afterAssign = await ReadAssignedAsync(teacher, student.StudentId);
		var removeResponse = await teacher.Client.SendAsync(
			teacher.AuthorizedDeleteRequest(
				$"/api/students/{student.StudentId}/extra-curriculars/{activity.ExtraCurricularId}"),
			TestContext.Current.CancellationToken);
		var afterRemove = await ReadAssignedAsync(teacher, student.StudentId);

		ShouldlyHelpers.Satisfy(
			() => assignResponse.StatusCode.ShouldBe(HttpStatusCode.Created),
			() => afterAssign.Select(entry => entry.ExtraCurricularId).ShouldBe([activity.ExtraCurricularId]),
			() => removeResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent),
			() => afterRemove.ShouldBeEmpty());
	}

	private async Task<IsolatedHttpClient> SignInAsync(string emailPrefix, Role role, string sourceIp)
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, emailPrefix, role);
		var client = fixture.CreateIsolatedClient(sourceIp);
		await client.LoginAsync(email, _password);
		return client;
	}

	private static async Task<StudentResult> CreateStudentAsync(
		IsolatedHttpClient client,
		string firstName,
		string lastName,
		PhaseType phase)
	{
		var request = new CreateStudentRequest(
			firstName,
			lastName,
			new DateOnly(2014, 5, 12),
			GradeType.Grade4,
			ClassType.A1,
			phase,
			Language.English);

		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/students", request), TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		return (await response.Content.ReadFromJsonAsync<StudentResult>(_jsonOptions, TestContext.Current.CancellationToken))
			.ShouldNotBeNull();
	}

	private static async Task<ExtraCurricularResult> CreateActivityAsync(
		IsolatedHttpClient client,
		string description,
		PhaseType phase)
	{
		var request = new CreateExtraCurricularRequest(
			description, phase, [new PracticeTimeRequest(DayOfWeek.Monday, new TimeOnly(15, 0))]);

		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/extra-curriculars", request), TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created, payload);

		return JsonSerializer.Deserialize<ExtraCurricularResult>(payload, _jsonOptions).ShouldNotBeNull();
	}

	private static async Task AssignAsync(IsolatedHttpClient client, Guid studentId, Guid extraCurricularId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest(
				$"/api/students/{studentId}/extra-curriculars", new AssignExtraCurricularRequest(extraCurricularId)),
			TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created, payload);
	}

	private static async Task<List<ExtraCurricularResult>> ReadAssignedAsync(IsolatedHttpClient client, Guid studentId)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest($"/api/students/{studentId}/extra-curriculars"),
			TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.OK, payload);

		return JsonSerializer.Deserialize<List<ExtraCurricularResult>>(payload, _jsonOptions).ShouldNotBeNull();
	}
}