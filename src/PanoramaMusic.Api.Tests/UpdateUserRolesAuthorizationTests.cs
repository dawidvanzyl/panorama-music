using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Identity.Application.Requests.Admin;
using PanoramaMusic.Identity.Domain.Enums;
using Shouldly;
using System.Net;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class UpdateUserRolesAuthorizationTests(ApiTestFixture fixture)
{
	private const string _password = "UpdateUserRolesAuthorizationTests123!";

	[Fact]
	[Trait("AC", "213UC3")]
	public async Task PatchUserRoles_CallerHasCoordinatorRoleOnly_Returns403()
	{
		var (email, _) = await fixture.SeedActiveUserAsync(_password, "coordinator-only", Role.Coordinator);
		var (_, targetUserId) = await fixture.SeedActiveUserAsync(_password, "role-update-target");

		var client = fixture.CreateIsolatedClient("10.0.50.1");
		await client.LoginAsync(email, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedPatchRequest($"/api/users/{targetUserId}", new UpdateUserRolesRequest([Role.Teacher])),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
	}
}