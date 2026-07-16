using Dapper;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Models;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using System.Net;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class AuthorizationDeniedAuditTests(ApiTestFixture fixture)
{
	private const string _password = "AuthorizationDeniedAuditTests123!";

	[Fact]
	[Trait("AC", "M1.5UC20")]
	public async Task NonAdminHitsAdminOnlyEndpoint_Returns403_AndWritesAnAuthorizationDeniedAuditRow()
	{
		var (email, userId) = await fixture.SeedActiveUserAsync(_password, "authz-denied");
		var client = fixture.CreateIsolatedClient("10.0.20.1");
		await client.LoginAsync(email, _password);

		var response = await client.Client.SendAsync(
			client.AuthorizedGetRequest("/api/auth/admin/sessions"),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);

		var row = await FetchLatestAuthorizationDeniedRowAsync(fixture, userId, TestContext.Current.CancellationToken);

		row.ShouldNotBeNull();
		row.ActorEmail.ShouldBe(email);
		row.Outcome.ShouldBe("failure");
		row.Reason.ShouldBe("Forbidden");
		row.Detail.ShouldContain("/api/auth/admin/sessions");
	}

	private static async Task<TestAuditRow?> FetchLatestAuthorizationDeniedRowAsync(ApiTestFixture fixture, Guid actorId, CancellationToken cancellationToken)
	{
		using var scope = fixture.Services.CreateScope();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(cancellationToken);
		var row = await unitOfWork.Connection.QueryFirstOrDefaultAsync<TestAuditRow>(
			new CommandDefinition(
				"""
				SELECT outcome AS "Outcome", reason AS "Reason", actor_email AS "ActorEmail", detail::text AS "Detail"
				FROM audit.audit_events
				WHERE event_type = 'identity.authorization.denied' AND actor_id = @actor_id
				ORDER BY occurred_at DESC
				LIMIT 1;
				""",
				new { actor_id = actorId },
				unitOfWork.Transaction,
				cancellationToken: cancellationToken));
		await unitOfWork.CommitAsync(cancellationToken);
		return row;
	}
}