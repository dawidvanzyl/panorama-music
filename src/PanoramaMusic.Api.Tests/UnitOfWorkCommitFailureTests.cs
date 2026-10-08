using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using PanoramaMusic.Api.Tests.Fixtures;
using PanoramaMusic.Api.Tests.Providers;
using PanoramaMusic.Api.Tests.Transactions;
using PanoramaMusic.Identity.Application.Requests.Auth;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Persistence.Transactions;
using PanoramaMusic.Testing;
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
		var correlationId = Guid.NewGuid().ToString();
		var captureProvider = new CaptureLoggerProvider();

		await using var factory = fixture.WithWebHostBuilder(builder =>
		{
			builder.UseUrls("http://127.0.0.1:0");
			builder.ConfigureServices(services =>
			{
				services.AddHttpContextAccessor();
				services.AddSingleton<ILoggerFactory>(new LoggerFactory([captureProvider]));
				services.AddScoped<NpgsqlUnitOfWork>();
				services.AddScoped<IUnitOfWork>(provider => new CommitFailingUnitOfWork(
					provider.GetRequiredService<NpgsqlUnitOfWork>(),
					provider.GetRequiredService<IHttpContextAccessor>()));
			});
		});
		factory.UseKestrel(0);
		factory.StartServer();

		using var client = factory.CreateClient();
		using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
		{
			Content = JsonContent.Create(new LoginRequest(email, _password)),
		};
		request.Headers.Add("X-Test-Remote-Ip", "10.0.35.1");
		request.Headers.Add(CommitFailingUnitOfWork.HeaderName, "1");
		request.Headers.Add("X-Correlation-ID", correlationId);

		using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

		using var scope = fixture.Services.CreateScope();
		var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
		var activeTokens = await refreshTokenRepository.GetActiveByUserIdAsync(userId, TestContext.Current.CancellationToken);

		var loggedWithCorrelationId = await WaitForErrorLogAsync(captureProvider, correlationId);

		ShouldlyHelpers.Satisfy(
			() => ((int)response.StatusCode).ShouldBeGreaterThanOrEqualTo(400),
			() => activeTokens.ShouldBeEmpty(),
			() => loggedWithCorrelationId.ShouldBeTrue());
	}

	private static async Task<bool> WaitForErrorLogAsync(CaptureLoggerProvider captureProvider, string correlationId)
	{
		for (var attempt = 0; attempt < 50; attempt++)
		{
			if (captureProvider.Entries.Any(entry => entry.Level == LogLevel.Error && HasCorrelationId(entry, correlationId)))
				return true;

			await Task.Delay(100, TestContext.Current.CancellationToken);
		}

		return false;
	}

	private static bool HasCorrelationId(CapturedLogEntry entry, string correlationId) =>
		entry.Properties.TryGetValue("CorrelationId", out var value) && Equals(value?.ToString(), correlationId);
}