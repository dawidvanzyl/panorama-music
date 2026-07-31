using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Middleware;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Students.Application.Models;
using Shouldly;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace PanoramaMusic.Api.Tests;

/// <summary>
/// Every endpoint returning a typed 200/201 body must appear in <see cref="_expected"/> with an
/// explicit verdict. That row is the record that the endpoint's payload was considered — an
/// endpoint nobody has thought about fails <see cref="EveryBodyReturningEndpoint_HasAnExpectationDeclared"/>
/// by name, and the verdict itself is reviewable in one place rather than scattered across six
/// route files.
/// <para>
/// The criterion for choosing a verdict is documented on <c>MarkSensitiveResponse</c> in
/// <c>SensitiveResponseExtensions</c>, where a developer declaring an endpoint will meet it.
/// </para>
/// </summary>
[Collection(ApiTestCollection.Name)]
public sealed class CacheClassificationTests(ApiTestFixture fixture)
{
	private const string _password = "CacheClassification123!";

	/// <summary>
	/// Keyed on the endpoint name assigned by <c>WithName(...)</c>, which ASP.NET Core requires
	/// to be unique across the application.
	/// </summary>
	private static readonly Dictionary<string, CacheExpectation> _expected = new()
	{
		// Student payloads carry names, dates of birth and grade/class/phase.
		["GetStudents"] = CacheExpectation.NoStore,
		["GetStudentById"] = CacheExpectation.NoStore,
		["GetSiblings"] = CacheExpectation.NoStore,
		["CreateStudent"] = CacheExpectation.NoStore,
		["UpdateStudent"] = CacheExpectation.NoStore,
		["AddSibling"] = CacheExpectation.NoStore,

		// Guardian payloads carry names and contact details.
		["AddGuardian"] = CacheExpectation.NoStore,
		["GetGuardians"] = CacheExpectation.NoStore,
		["SyncGuardians"] = CacheExpectation.NoStore,
		["GetMissingSiblingGuardians"] = CacheExpectation.NoStore,
		["UpdateGuardian"] = CacheExpectation.NoStore,

		// Identity payloads carry email addresses, roles, invite URLs and tokens.
		["GetUsers"] = CacheExpectation.NoStore,
		["CreateUser"] = CacheExpectation.NoStore,
		["RegenerateInviteToken"] = CacheExpectation.NoStore,
		["UpdateUserRoles"] = CacheExpectation.NoStore,
		["Login"] = CacheExpectation.NoStore,
		["RefreshToken"] = CacheExpectation.NoStore,

		// Session payloads carry IP addresses, device labels and the owning user's email.
		["GetOwnSessions"] = CacheExpectation.NoStore,
		["GetAllSessions"] = CacheExpectation.NoStore,

		// Audit events name the acting user and the affected record.
		["GetAuditEvents"] = CacheExpectation.NoStore,

		// Relationship types are a reference lookup; the count is an aggregate. Neither
		// identifies anybody.
		["GetGuardianRelationships"] = CacheExpectation.Cacheable,
		["CreateGuardianRelationship"] = CacheExpectation.Cacheable,
		["RenameGuardianRelationship"] = CacheExpectation.Cacheable,
		["CountGuardianRelationship"] = CacheExpectation.Cacheable,

		// A bare boolean; the route carries only an opaque GUID, so a cached copy discloses
		// nothing about an identifiable person.
		["IsGuardianShared"] = CacheExpectation.Cacheable,
	};

	private static readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web)
	{
		Converters = { new JsonStringEnumConverter() },
	};

	private enum CacheExpectation
	{
		NoStore,
		Cacheable,
	}

	[Fact]
	[Trait("AC", "218UC1")]
	public void EveryBodyReturningEndpoint_HasAnExpectationDeclared()
	{
		var undeclared = BodyReturningEndpointNames()
			.Where(name => !_expected.ContainsKey(name))
			.ToList();

		undeclared.ShouldBeEmpty(
			"These endpoints return a typed 200/201 body but no cache expectation has been " +
			"declared for them. Add a row to CacheClassificationTests._expected recording " +
			"whether the payload is sensitive: " + string.Join(", ", undeclared));
	}

	[Fact]
	[Trait("AC", "218UC1")]
	public void EveryBodyReturningEndpoint_MatchesItsDeclaredExpectation()
	{
		var endpoints = BodyReturningEndpoints()
			.Where(endpoint => _expected.ContainsKey(NameOf(endpoint)))
			.ToList();

		// Guards against the whole suite passing vacuously if the endpoint data source ever
		// resolves empty — the assertions below would then have nothing to disagree with.
		endpoints.ShouldNotBeEmpty();

		var mismatches = endpoints
			.Select(endpoint => (Name: NameOf(endpoint), Expected: _expected[NameOf(endpoint)], Actual: ActualOf(endpoint)))
			.Where(endpoint => endpoint.Expected != endpoint.Actual)
			.Select(endpoint => endpoint.Expected == CacheExpectation.NoStore
				? $"{endpoint.Name} is expected to be sensitive but does not call MarkSensitiveResponse()"
				: $"{endpoint.Name} is expected to be cacheable but calls MarkSensitiveResponse()")
			.ToList();

		mismatches.ShouldBeEmpty(string.Join("; ", mismatches));
	}

	[Fact]
	[Trait("AC", "218UC2")]
	public void EveryDeclaredExpectation_MapsToARegisteredEndpoint()
	{
		var registered = BodyReturningEndpointNames().ToHashSet();

		var stale = _expected.Keys.Where(name => !registered.Contains(name)).ToList();

		stale.ShouldBeEmpty(
			"These rows in CacheClassificationTests._expected name endpoints that no longer " +
			"return a typed body. Remove them: " + string.Join(", ", stale));
	}

	[Fact]
	[Trait("AC", "218UC5")]
	public void EndpointsWithNoTypedResponseBody_AreExemptFromExpectation()
	{
		var registered = AllEndpointNames().ToHashSet();
		var required = BodyReturningEndpointNames().ToHashSet();

		ShouldlyHelpers.Satisfy(
			// Assert the two sample endpoints still exist before asserting they are exempt.
			// Without this, renaming or deleting either one would make the exemption below pass
			// for the wrong reason.
			() => registered.ShouldContain("Logout"),
			() => registered.ShouldContain("GetHealth"),
			() => required.ShouldNotContain("Logout", "a 204 response has no body to cache"),
			() => required.ShouldNotContain("GetHealth", "an untyped Ok() declares no response type"));
	}

	[Fact]
	[Trait("AC", "218UC3")]
	[Trait("AC", "218UC6")]
	public async Task GetStudents_ExpectedSensitive_CarriesCacheControlNoStoreAndIsOtherwiseUnchanged()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "cache-classification-sensitive", Role.Teacher);
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
	public async Task GetGuardianRelationships_ExpectedCacheable_OmitsCacheControlNoStoreAndIsOtherwiseUnchanged()
	{
		var (teacherEmail, _) = await fixture.SeedActiveUserAsync(_password, "cache-classification-cacheable", Role.Teacher);
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

	private IEnumerable<Endpoint> BodyReturningEndpoints() =>
		fixture.Services.GetRequiredService<EndpointDataSource>().Endpoints.Where(ReturnsBody);

	private IEnumerable<string> BodyReturningEndpointNames() => BodyReturningEndpoints().Select(NameOf);

	/// <summary>
	/// Names of every registered endpoint that declares one. Unnamed endpoints — static files,
	/// the OpenAPI document — are skipped rather than throwing, since this set exists only to
	/// confirm a named endpoint is still present.
	/// </summary>
	private IEnumerable<string> AllEndpointNames() =>
		fixture.Services.GetRequiredService<EndpointDataSource>().Endpoints
			.Select(endpoint => endpoint.Metadata.GetMetadata<IEndpointNameMetadata>()?.EndpointName)
			.OfType<string>();

	/// <summary>
	/// An endpoint is worth classifying only when it declares a typed 200/201 body. A 204, or an
	/// untyped <c>Produces(200)</c> whose metadata type is <see langword="void"/>, has no body
	/// for a cache to store.
	/// </summary>
	private static bool ReturnsBody(Endpoint endpoint) =>
		endpoint.Metadata.OfType<IProducesResponseTypeMetadata>().Any(metadata =>
			metadata.StatusCode is StatusCodes.Status200OK or StatusCodes.Status201Created
			&& metadata.Type is not null
			&& metadata.Type != typeof(void));

	private static CacheExpectation ActualOf(Endpoint endpoint) =>
		endpoint.Metadata.GetMetadata<SensitiveResponseMetadata>() is not null
			? CacheExpectation.NoStore
			: CacheExpectation.Cacheable;

	private static string NameOf(Endpoint endpoint) =>
		endpoint.Metadata.GetMetadata<IEndpointNameMetadata>()?.EndpointName
		?? throw new InvalidOperationException(
			$"Endpoint '{endpoint.DisplayName}' returns a body but declares no WithName(...), " +
			"so no cache expectation can be recorded against it.");
}