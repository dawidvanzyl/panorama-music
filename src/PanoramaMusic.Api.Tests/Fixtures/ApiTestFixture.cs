using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Npgsql;
using PanoramaMusic.Api.Tests.Middleware;
using PanoramaMusic.Api.Tests.Providers;
using PanoramaMusic.Api.Tests.ValueObjects;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using PanoramaMusic.Persistence.Transactions;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Api.Tests.Fixtures;

/// <summary>
/// Program.cs reads the connection string into a local variable from plain
/// top-level code before any WebApplicationFactory host-builder hook can run,
/// so the only reliable override point is environment variables — the same
/// mechanism docker-compose and CI already use to configure this app.
/// </summary>
public sealed class ApiTestFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
		.WithImage("postgres:16")
		.Build();

	private readonly string _webRoot = Directory.CreateTempSubdirectory("panorama-api-tests-wwwroot-").FullName;

	public async ValueTask InitializeAsync()
	{
		await _postgres.StartAsync();

		// The app runs as the restricted panorama_app role (provisioned during
		// InitializeDatabase); migrations run over the superuser connection.
		var applicationConnectionString = new NpgsqlConnectionStringBuilder(_postgres.GetConnectionString())
		{
			Username = "panorama_app",
			Password = "panorama_app_test",
		}.ConnectionString;

		Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", applicationConnectionString);
		Environment.SetEnvironmentVariable("ConnectionStrings__Migrations", _postgres.GetConnectionString());
		Environment.SetEnvironmentVariable("JWT__Secret", "test-only-secret-at-least-32-characters-long!!");
		Environment.SetEnvironmentVariable("JWT__Issuer", "panorama-music-api-tests");
		Environment.SetEnvironmentVariable("JWT__Audience", "panorama-music-client-tests");
		Environment.SetEnvironmentVariable("JWT__AbsoluteSessionLifetimeDays", "30");
		Environment.SetEnvironmentVariable("ASPNETCORE_WEBROOT", _webRoot);

		// Smaller account limit than the IP limit lets tests trip the account-keyed
		// bucket deterministically while the IP-keyed bucket still has headroom.
		Environment.SetEnvironmentVariable("RateLimiting__Auth__IpPermitLimit", "10");
		Environment.SetEnvironmentVariable("RateLimiting__Auth__AccountPermitLimit", "3");
		Environment.SetEnvironmentVariable("RateLimiting__Auth__WindowSeconds", "60");

		File.WriteAllText(Path.Combine(_webRoot, "index.html"), "<html><body>test</body></html>");
	}

	/*
	 * var (adminEmail, _) = await fixture.SeedActiveUserAsync(_password, "audit-routes", Role.Admin);
		var adminClient = fixture.CreateIsolatedClient("10.0.30.1");
		await adminClient.LoginAsync(adminEmail, _password);
	 */

	internal async Task<(string Email, Guid UserId)> SeedActiveUserAsync(string password, string emailPrefix, Role? role = null)
	{
		using var scope = Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var userRoleRepository = scope.ServiceProvider.GetRequiredService<IUserRoleRepository>();
		var passwordHashService = scope.ServiceProvider.GetRequiredService<IPasswordHashService>();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

		var email = $"{emailPrefix}-{Guid.NewGuid()}@example.com";
		var user = new User(Guid.NewGuid(), Email.Create(email), DateTime.UtcNow);
		user.SetPassword(passwordHashService.Hash(password));
		user.Activate();

		await unitOfWork.BeginAsync(TestContext.Current.CancellationToken);
		await userRepository.CreateAsync(user, TestContext.Current.CancellationToken);
		await userRepository.UpdatePasswordAsync(user.UserId, user.PasswordHash!.Value, clearRequiresPasswordReset: false, TestContext.Current.CancellationToken);

		if (role.HasValue)
			await userRoleRepository.CreateManyAsync(user.UserId, [role.Value], TestContext.Current.CancellationToken);

		await unitOfWork.CommitAsync(TestContext.Current.CancellationToken);

		return (email, user.UserId);
	}

	internal async Task<string> SeedUserWithRefreshTokenAsync()
	{
		using var scope = Services.CreateScope();
		var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
		var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();

		var user = new User(Guid.NewGuid(), Email.Create($"rate-limit-token-{Guid.NewGuid()}@example.com"), DateTime.UtcNow);
		user.Activate();

		var rawToken = RawToken.Generate();
		var tokenId = Guid.NewGuid();
		var refreshToken = new RefreshToken(tokenId, user.UserId, rawToken.Hash, DateTime.UtcNow.AddDays(7), tokenId, DateTime.UtcNow, null, null);

		await unitOfWork.BeginAsync(TestContext.Current.CancellationToken);
		await userRepository.CreateAsync(user, TestContext.Current.CancellationToken);
		await refreshTokenRepository.CreateAsync(refreshToken, TestContext.Current.CancellationToken);
		await unitOfWork.CommitAsync(TestContext.Current.CancellationToken);

		return rawToken.Value;
	}

	internal async Task<Guid> GetSessionIdForRefreshTokenAsync(string refreshTokenCookie)
	{
		using var scope = Services.CreateScope();
		var refreshTokenRepository = scope.ServiceProvider.GetRequiredService<IRefreshTokenRepository>();
		var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
		await unitOfWork.BeginAsync(TestContext.Current.CancellationToken);
		var tokenHash = RawToken.From(refreshTokenCookie).Hash;
		var token = await refreshTokenRepository.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken);
		await unitOfWork.CommitAsync(TestContext.Current.CancellationToken);
		return token!.TokenId;
	}

	internal IsolatedHttpClient CreateIsolatedClient(string simulatedIp)
	{
		var client = CreateClient();
		client.DefaultRequestHeaders.Add("X-Test-Remote-Ip", simulatedIp);
		return new IsolatedHttpClient(client);
	}

	internal IsolatedHttpClient CreateIsolatedClientWithCapture(CaptureLoggerProvider captureProvider, string simulatedIp)
	{
		var client = WithWebHostBuilder(builder =>
			builder.ConfigureServices(services =>
				services.AddSingleton<ILoggerFactory>(new LoggerFactory([captureProvider]))))
			.CreateClient();

		client.DefaultRequestHeaders.Add("X-Test-Remote-Ip", simulatedIp);
		return new IsolatedHttpClient(client);
	}

	protected override void ConfigureWebHost(IWebHostBuilder builder)
	{
		builder.ConfigureServices(services => services.AddSingleton<IStartupFilter, TestRemoteIpStartupFilter>());
	}

	public override async ValueTask DisposeAsync()
	{
		await base.DisposeAsync();
		await _postgres.DisposeAsync();
		Directory.Delete(_webRoot, recursive: true);
	}
}