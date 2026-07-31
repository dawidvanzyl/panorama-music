using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using Shouldly;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class SecurityHeadersTests(ApiTestFixture fixture)
{
	private const string _password = "SecurityHeadersTests123!";

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task GetRoot_StaticHtmlResponse_CarriesSecurityHeadersIncludingCoop()
	{
		var client = fixture.CreateClient();

		var response = await client.GetAsync("/", TestContext.Current.CancellationToken);

		response.Content.Headers.ContentType?.MediaType.ShouldBe("text/html");
		response.Headers.GetValues("Strict-Transport-Security").ShouldContain("max-age=31536000; includeSubDomains");
		response.Headers.GetValues("X-Content-Type-Options").ShouldContain("nosniff");
		response.Headers.GetValues("Referrer-Policy").ShouldContain("no-referrer");
		response.Headers.GetValues("Content-Security-Policy").Single().ShouldContain("object-src 'none'");
		response.Headers.GetValues("Cross-Origin-Opener-Policy").ShouldContain("same-origin");
	}

	[Fact]
	[Trait("AC", "M1.4UC1")]
	public async Task GetHealth_JsonResponse_CarriesSecurityHeadersWithoutCoop()
	{
		var client = fixture.CreateClient();

		var response = await client.GetAsync("/api/health", TestContext.Current.CancellationToken);

		response.Content.Headers.ContentType?.MediaType.ShouldBe("application/json");
		response.Headers.GetValues("Strict-Transport-Security").ShouldContain("max-age=31536000; includeSubDomains");
		response.Headers.GetValues("X-Content-Type-Options").ShouldContain("nosniff");
		response.Headers.GetValues("Referrer-Policy").ShouldContain("no-referrer");
		response.Headers.GetValues("Content-Security-Policy").Single().ShouldContain("object-src 'none'");
		response.Headers.Contains("Cross-Origin-Opener-Policy").ShouldBeFalse();
	}

	[Fact]
	[Trait("AC", "M1.4UC2")]
	public async Task PostLogin_SensitiveEndpoint_CarriesCacheControlNoStore()
	{
		var client = fixture.CreateClient();

		var response = await client.PostAsJsonAsync("/api/auth/login", new { }, TestContext.Current.CancellationToken);

		response.Headers.GetValues("Cache-Control").ShouldContain(value => value.Contains("no-store"));
	}

	[Fact]
	[Trait("AC", "M1.5UC11")]
	public async Task GetAudit_SensitiveEndpoint_CarriesCacheControlNoStore()
	{
		var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "security-headers", Role.Admin);
		var client = fixture.CreateIsolatedClient("10.0.40.1");
		await client.LoginAsync(adminEmail, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/audit"),
			TestContext.Current.CancellationToken);

		response.Headers.GetValues("Cache-Control").ShouldContain(value => value.Contains("no-store"));
	}

	/// <summary>
	/// The two tests below cover the wiring between an endpoint's cache classification and the
	/// header it produces, one per direction. Which verdict each endpoint carries is asserted in
	/// <see cref="CacheClassificationTests"/>; correctness of an individual verdict is a review
	/// judgement and is deliberately not tested per endpoint.
	/// </summary>
	[Fact]
	[Trait("AC", "218UC3")]
	[Trait("AC", "218UC6")]
	public async Task GetStudents_SensitiveEndpoint_CarriesCacheControlNoStoreAndIsOtherwiseUnchanged()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "security-headers-sensitive", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.60.1");
		await client.LoginAsync(teacherEmail, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/students"),
			TestContext.Current.CancellationToken);

		var students = await response.Content.ReadFromJsonAsync<List<StudentResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => response.Headers.GetValues("Cache-Control").ShouldContain(value => value.Contains("no-store")),
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => students.ShouldNotBeNull());
	}

	[Fact]
	[Trait("AC", "218UC4")]
	[Trait("AC", "218UC6")]
	public async Task GetGuardianRelationships_NonSensitiveEndpoint_OmitsCacheControlNoStoreAndIsOtherwiseUnchanged()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "security-headers-non-sensitive", Role.Teacher);
		var client = fixture.CreateIsolatedClient("10.0.60.2");
		await client.LoginAsync(teacherEmail, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/guardian-relationships"),
			TestContext.Current.CancellationToken);

		var relationships = await response.Content.ReadFromJsonAsync<List<GuardianRelationshipResult>>(_jsonOptions, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => response.Headers.Contains("Cache-Control").ShouldBeFalse(),
			() => response.StatusCode.ShouldBe(HttpStatusCode.OK),
			() => relationships.ShouldNotBeNull());
	}
}