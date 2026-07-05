using Npgsql;
using PanoramaMusic.Audit.Infrastructure.Persistence;
using PanoramaMusic.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Audit.Tests.Infrastructure;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role,
/// and runs the Audit context migrations — mirroring what InitializeDatabase
/// does at application startup.
/// </summary>
public sealed class AuditDatabaseFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
		.WithImage("postgres:16")
		.Build();

	public string MigrationConnectionString { get; private set; } = string.Empty;
	public string ApplicationConnectionString { get; private set; } = string.Empty;

	public async ValueTask InitializeAsync()
	{
		await _postgres.StartAsync();

		MigrationConnectionString = _postgres.GetConnectionString();
		ApplicationConnectionString = new NpgsqlConnectionStringBuilder(MigrationConnectionString)
		{
			Username = DatabaseMigrator.ApplicationRoleName,
			Password = "panorama_app_test",
		}.ConnectionString;

		DatabaseMigrator.EnsureApplicationRole(MigrationConnectionString, ApplicationConnectionString);
		AuditMigrator.Run(MigrationConnectionString);
	}

	public async ValueTask DisposeAsync()
	{
		await _postgres.DisposeAsync();
	}
}