using Npgsql;
using PanoramaMusic.Persistence;
using PanoramaMusic.Students.Infrastructure.Persistence;
using Testcontainers.PostgreSql;
using Xunit;

namespace PanoramaMusic.Students.Tests.Fixtures;

/// <summary>
/// Starts a disposable Postgres, provisions the restricted panorama_app role,
/// and runs the Students context migrations — mirroring what InitializeDatabase
/// does at application startup.
/// </summary>
public sealed class StudentsDatabaseFixture : IAsyncLifetime
{
	private readonly PostgreSqlContainer _postgres;
	private string _migrationConnectionString = null!;

	public StudentsDatabaseFixture()
	{
		_postgres = new PostgreSqlBuilder()
			.WithImage("postgres:16")
			.Build();
	}

	public NpgsqlConnection Connection { get; private set; } = null!;

	public async ValueTask InitializeAsync()
	{
		await _postgres.StartAsync();

		_migrationConnectionString = _postgres.GetConnectionString();
		var applicationConnectionString = new NpgsqlConnectionStringBuilder(_migrationConnectionString)
		{
			Username = DatabaseMigrator.ApplicationRoleName,
			Password = "panorama_app_test",
		}.ConnectionString;

		DatabaseMigrator.EnsureApplicationRole(_migrationConnectionString, applicationConnectionString);
		StudentMigrator.Run(_migrationConnectionString);

		Connection = new NpgsqlConnection(applicationConnectionString);
		await Connection.OpenAsync();
	}

	/// <summary>
	/// Re-runs the Students context migrator (schema → functions → seeds) against
	/// the same database, simulating a subsequent deploy's RunAlways seed pass.
	/// </summary>
	public void RerunMigrations() => StudentMigrator.Run(_migrationConnectionString);

	public async ValueTask DisposeAsync()
	{
		await Connection.CloseAsync();
		Connection.Dispose();
		await _postgres.DisposeAsync();
	}
}