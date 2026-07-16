using Npgsql;
using PanoramaMusic.Audit.Infrastructure.Persistence;
using PanoramaMusic.Persistence;
using System.Data.Common;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Audit.Tests.Fixtures;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role,
/// and runs the Audit context migrations — mirroring what InitializeDatabase
/// does at application startup.
/// </summary>
public sealed class AuditDatabaseFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres;

	public AuditDatabaseFixture()
	{
		_postgres = new PostgreSqlBuilder()
			.WithImage("postgres:16")
			.Build();
	}

	public Guid EventId { get; private set; }

	public NpgsqlConnection Connection { get; private set; } = null!;

	public async ValueTask InitializeAsync()
	{
		await _postgres.StartAsync();

		var migrationConnectionString = _postgres.GetConnectionString();
		var applicationConnectionString = new NpgsqlConnectionStringBuilder(migrationConnectionString)
		{
			Username = DatabaseMigrator.ApplicationRoleName,
			Password = "panorama_app_test",
		}.ConnectionString;

		DatabaseMigrator.EnsureApplicationRole(migrationConnectionString, applicationConnectionString);
		AuditMigrator.Run(migrationConnectionString);

		EventId = Guid.NewGuid();
		Connection = new NpgsqlConnection(applicationConnectionString);
		await Connection.OpenAsync();
		await InsertAuditEventAsync();
	}

	private async Task InsertAuditEventAsync()
	{
		// Global Arrange — insert a row as the application role via the insert function
		// (INSERT is permitted), so there is something to attempt SELECT on.
		await using (var insert = Connection.CreateCommand())
		{
			insert.CommandText = """
                SELECT audit.create_audit_event(
                    @id, now(), 'identity.session.login_succeeded',
                    NULL, NULL, NULL, '127.0.0.1', 'xunit', @correlation_id,
                    'success', NULL, '{}');
                """;
			insert.Parameters.AddWithValue("id", EventId);
			insert.Parameters.AddWithValue("correlation_id", Guid.NewGuid());
			await insert.ExecuteNonQueryAsync(TestContext.Current.CancellationToken);
		}
	}

	public async ValueTask DisposeAsync()
	{
		await Connection.CloseAsync();
		Connection.Dispose();
		await _postgres.DisposeAsync();
	}
}