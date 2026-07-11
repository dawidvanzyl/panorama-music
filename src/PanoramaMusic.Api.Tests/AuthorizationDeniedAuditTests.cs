using Dapper;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Middleware;
using PanoramaMusic.Identity.Application.Models;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
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
		var (email, userId) = await SeedActiveUserAsync();
		var client = fixture.CreateClient();
		client.DefaultRequestHeaders.Add(TestRemoteIpStartupFilter.HeaderName, "10.0.20.1");

		var accessToken = await LoginAsync(client, email);

		var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/admin/sessions");
		request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

		var response = await client.SendAsync(request, TestContext.Current.CancellationToken);
		response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);

		var row = await FetchLatestAuthorizationDeniedRowAsync(userId, TestContext.Current.CancellationToken);

		row.ShouldNotBeNull();
		row.ActorEmail.ShouldBe(email);
		row.Outcome.ShouldBe("failure");
		row.Reason.ShouldBe("Forbidden");
		row.Detail.ShouldContain("/api/auth/admin/sessions");
	}

	private async Task<AuditRow?> FetchLatestAuthorizationDeniedRowAsync(Guid actorId, CancellationToken cancellationToken)
	{
		using var scope = fixture.Services.CreateScope();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(cancellationToken);
		var row = await unitOfWork.Connection.QueryFirstOrDefaultAsync<AuditRow>(
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

	private sealed record AuditRow(string Outcome, string? Reason, string? ActorEmail, string Detail);

	private async Task<(string Email, Guid UserId)> SeedActiveUserAsync()
	{
		using var scope = fixture.Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

		var email = $"authz-denied-{Guid.NewGuid()}@example.com";
		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(passwordHashService.Hash(_password));
		user.Activate();

		await unitOfWork.BeginAsync(TestContext.Current.CancellationToken);
		await userRepository.CreateAsync(user, TestContext.Current.CancellationToken);
		await userRepository.UpdatePasswordAsync(user.UserId, user.PasswordHash!.Value, clearRequiresPasswordReset: false, TestContext.Current.CancellationToken);
		await unitOfWork.CommitAsync(TestContext.Current.CancellationToken);

		return (email, user.UserId);
	}

	private async Task<string> LoginAsync(HttpClient client, string email)
	{
		var response = await client.PostAsJsonAsync(
			"/api/auth/login",
			new LoginRequest(email, _password),
			TestContext.Current.CancellationToken);

		response.StatusCode.ShouldBe(HttpStatusCode.OK);
		var result = await response.Content.ReadFromJsonAsync<AccessTokenResult>(TestContext.Current.CancellationToken);
		return result!.AccessToken;
	}
}