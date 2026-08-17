using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Teachers.Application.Models;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class StudentCourseRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "268UC13")]
	public async Task GetTeachers_SignedInTeacher_IsReturnedTheRosterRatherThanRefused()
	{
		// The enroll form offers a teacher to assign, so a Teacher working on
		// Student Management has to be able to read the roster — while the rest of
		// the teacher record stays Coordinator-or-Admin.
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "enroll-roster-admin", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.90.1");
		await adminClient.LoginAsync(adminEmail, _password);
		var created = await CreateTeacherAsync(adminClient, "Lindiwe", "Mabaso");

		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "enroll-roster-teacher", Role.Teacher);
		var teacherClient = fixture.CreateIsolatedClient("10.0.90.2");
		await teacherClient.LoginAsync(teacherEmail, _password);

		var rosterResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest("/api/teachers"), TestContext.Current.CancellationToken);
		var maintenanceResponse = await teacherClient.Client.SendAsync(
			teacherClient.AuthorizedGetRequest($"/api/teachers/{created.TeacherId}"), TestContext.Current.CancellationToken);
		var anonymousResponse = await fixture.CreateClient()
			.GetAsync("/api/teachers", TestContext.Current.CancellationToken);

		var roster = await rosterResponse.Content.ReadFromJsonAsync<List<TeacherResult>>(
			_jsonOptions, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => rosterResponse.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => roster.ShouldNotBeNull().ShouldContain(t => t.TeacherId == created.TeacherId),
			// Only the roster read widened; reading one teacher's record did not.
			() => maintenanceResponse.StatusCode.ShouldBe(HttpStatusCode.Forbidden),
			() => anonymousResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized));
	}

	private static async Task<TeacherResult> CreateTeacherAsync(IsolatedHttpClient client, string firstName, string surname)
	{
		var response = await client.Client.SendAsync(
			client.AuthorizedPostRequest("/api/teachers", new { firstName, surname, isPrivate = false }),
			TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Created);

		return (await response.Content.ReadFromJsonAsync<TeacherResult>(
			_jsonOptions, TestContext.Current.CancellationToken)).ShouldNotBeNull();
	}
}