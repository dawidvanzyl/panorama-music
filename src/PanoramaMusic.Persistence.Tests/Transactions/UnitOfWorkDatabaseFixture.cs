using Npgsql;
using PanoramaMusic.Audit.Infrastructure.Persistence;
using PanoramaMusic.Identity.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Persistence.Tests.Transactions;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role,
/// and runs the Audit and Identity context migrations — the two contexts whose
/// writes the shared unit of work must commit and roll back atomically.
/// </summary>
public sealed class UnitOfWorkDatabaseFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
		.WithImage("postgres:16")
		.Build();

	public string MigrationConnectionString { get; private set; } = string.Empty;
	public string ApplicationConnectionString { get; private set; } = string.Empty;

	public async ValueTask InitializeAsync()
	{
		// The repositories call Postgres functions via CommandType.StoredProcedure,
		// which Npgsql 8+ maps to CALL unless the compat switch (also set by
		// Program.cs at startup) is enabled.
		AppContext.SetSwitch("Npgsql.EnableStoredProcedureCompatMode", true);

		await _postgres.StartAsync();

		MigrationConnectionString = _postgres.GetConnectionString();
		ApplicationConnectionString = new NpgsqlConnectionStringBuilder(MigrationConnectionString)
		{
			Username = DatabaseMigrator.ApplicationRoleName,
			Password = "panorama_app_test",
		}.ConnectionString;

		DatabaseMigrator.EnsureApplicationRole(MigrationConnectionString, ApplicationConnectionString);
		AuditMigrator.Run(MigrationConnectionString);
		IdentityMigrator.Run(MigrationConnectionString);
	}

	public async ValueTask DisposeAsync()
	{
		await _postgres.DisposeAsync();
	}
}