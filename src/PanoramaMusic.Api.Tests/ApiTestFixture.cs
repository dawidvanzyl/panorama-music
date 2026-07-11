using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using PanoramaMusic.Api.Tests.Middleware;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Api.Tests;

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