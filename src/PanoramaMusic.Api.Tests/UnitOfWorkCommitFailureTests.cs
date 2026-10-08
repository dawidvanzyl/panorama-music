using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Transactions;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using Shouldly;
using System.Net.Http.Json;
using Xunit;

namespace PanoramaMusic.Api.Tests;

[Collection(ApiTestCollection.Name)]
public sealed class UnitOfWorkCommitFailureTests(ApiTestFixture fixture)
{
	private const string _password = "UnitOfWorkCommitFailureTests123!";

	[Fact]
	[Trait("AC", "355UC4")]
	public async Task Login_CommitFailsAsResponseStarts_ClientGetsNoSuccessStatusAndWriteIsNotPersisted()
	{
		var (email, userId) = await fixture.SeedActiveUserAsync(_password, "commit-failure");

		await using var factory = fixture.WithWebHostBuilder(builder =>
		{
			builder.ConfigureServices(services =>
			{
				services.AddHttpContextAccessor();
				services.AddScoped<NpgsqlUnitOfWork>();
				services.AddScoped<IUnitOfWork>(provider => new CommitFailingUnitOfWork(
					provider.GetRequiredService<NpgsqlUnitOfWork>(),
					provider.GetRequiredService<IHttpContextAccessor>()));
			});
		});
		factory.UseKestrel();
		factory.StartServer();

		using var client = factory.CreateClient();
		using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
		{
			Content = JsonContent.Create(new LoginRequest(email, _password)),
		};
		request.Headers.Add("X-Test-Remote-Ip", "10.0.35.1");
		request.Headers.Add(CommitFailingUnitOfWork.HeaderName, "1");

		using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

		using var scope = fixture.Services.CreateScope();
		var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
		var activeTokens = await refreshTokenRepository.GetActiveByUserIdAsync(userId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => ((int)response.StatusCode).ShouldBeGreaterThanOrEqualTo(400),
			() => activeTokens.ShouldBeEmpty());
	}
}