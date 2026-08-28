using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class LessonStructureRoutesTests(ApiTestFixture fixture)
{
	private const string _password = "TestPass123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	private static readonly (LessonType LessonType, DurationType DurationType, OccurrenceType OccurrenceType)[] _seededCombinations =
	[
		(LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool),
		(LessonType.Individual, DurationType.Hour, OccurrenceType.AfterSchool),
		(LessonType.Individual, DurationType.HalfHour, OccurrenceType.DuringSchool),
		(LessonType.Individual, DurationType.HalfHour, OccurrenceType.AfterSchool),
		(LessonType.Group, DurationType.Hour, OccurrenceType.DuringSchool),
		(LessonType.Group, DurationType.Hour, OccurrenceType.AfterSchool),
		(LessonType.Group, DurationType.HalfHour, OccurrenceType.DuringSchool),
		(LessonType.Group, DurationType.HalfHour, OccurrenceType.AfterSchool),
	];

	[Fact]
	[Trait("AC", "256UC1")]
	public async Task GetLessonStructures_AuthenticatedStaffUser_ReturnsEverySeededCombination()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "lesson-structures-teacher", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.60.1");
		await client.LoginAsync(teacherEmail, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/lesson-structures"), TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var structures = JsonSerializer.Deserialize<List<LessonStructureResult>>(payload, _jsonOptions)
			.ShouldNotBeNull();

		ShouldlyHelpers.Satisfy(
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => structures.Count.ShouldBe(_seededCombinations.Length),
			() => structures
				.Select(s => (s.LessonType, s.DurationType, s.OccurrenceType))
				.ShouldBe(_seededCombinations, ignoreOrder: true));
	}

	[Fact]
	[Trait("AC", "256UC2")]
	public async Task GetLessonStructures_ReturnedStructure_CarriesItsIdentifierAndEnumKeysNotDisplayText()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "lesson-structures-keys", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.60.2");
		await client.LoginAsync(teacherEmail, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/lesson-structures"), TestContext.Current.CancellationToken);
		var payload = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
		var structures = JsonSerializer.Deserialize<List<LessonStructureResult>>(payload, _jsonOptions);

		ShouldlyHelpers.Satisfy(
			() => structures.ShouldNotBeNull().ShouldAllBe(s => s.LessonStructureId != Guid.Empty),
			() => payload.ShouldContain("\"HalfHour\""),
			() => payload.ShouldContain("\"DuringSchool\""),
			// The human-readable labels are the consuming screen's concern; the
			// wire contract carries the enum keys only.
			() => payload.ShouldNotContain("Half Hour"),
			() => payload.ShouldNotContain("During School"),
			() => payload.ShouldNotContain("After School"));
	}

	[Fact]
	[Trait("AC", "256UC3")]
	public async Task GetLessonStructures_UnauthenticatedRequest_IsRejected()
	{
		var client = fixture.CreateClient();

		var response = await client.GetAsync("/api/lesson-structures", TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
	}

	[Fact]
	[Trait("AC", "273UC3")]
	public async Task GetLessonStructures_Admin_IsRejectedWithForbidden()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "lesson-structures-admin", Role.Admin);
		var client = fixture.CreateIsolatedClient("10.0.60.3");
		await client.LoginAsync(adminEmail, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/lesson-structures"), TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}
}