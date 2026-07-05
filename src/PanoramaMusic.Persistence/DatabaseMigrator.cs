using DbUp;
using DbUp.Engine;
using DbUp.Support;
using Npgsql;
using System.Reflection;

namespace PanoramaMusic.Persistence;

public static class DatabaseMigrator
{
	/// <summary>
	/// The database role the application connects as. Grant scripts in each
	/// bounded context's migrations reference this name literally, so the
	/// application connection string must use it.
	/// </summary>
	public const string ApplicationRoleName = "panorama_app";

	public static void Run(string connectionString, bool ensureDatabase = false)
	{
		if (ensureDatabase)
		{
			EnsureDatabase.For.PostgresqlDatabase(connectionString);
		}
	}

	/// <summary>
	/// Provisions the application LOGIN role using the credentials from the
	/// application connection string, executed over the privileged migration
	/// connection. Must run before any context migrator so grant scripts can
	/// reference the role.
	/// </summary>
	public static void EnsureApplicationRole(string migrationConnectionString, string applicationConnectionString)
	{
		var applicationConnection = new NpgsqlConnectionStringBuilder(applicationConnectionString);

		if (!string.Equals(applicationConnection.Username, ApplicationRoleName, StringComparison.Ordinal))
			throw new InvalidOperationException($"The application connection string must use the '{ApplicationRoleName}' role — grant scripts reference that role name. Found '{applicationConnection.Username}'.");

		if (string.IsNullOrWhiteSpace(applicationConnection.Password))
			throw new InvalidOperationException($"The application connection string must include a password for the '{ApplicationRoleName}' role.");

		using NpgsqlConnection connection = new(migrationConnectionString);
		connection.Open();

		using var command = connection.CreateCommand();
		// Role names cannot be parameterized in DDL; the password is escaped via
		// format(%L) inside the DO block. The role is not a superuser and holds
		// only the privileges granted by context migrations.
		var escapedPassword = applicationConnection.Password.Replace("'", "''");
		command.CommandText = $"""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{ApplicationRoleName}') THEN
                    EXECUTE format('CREATE ROLE {ApplicationRoleName} LOGIN PASSWORD %L', '{escapedPassword}');
                ELSE
                    EXECUTE format('ALTER ROLE {ApplicationRoleName} LOGIN PASSWORD %L', '{escapedPassword}');
                END IF;
            END
            $$;
            """;
		command.ExecuteNonQuery();
	}

	public static void Reset(string connectionString)
	{
		using NpgsqlConnection connection = new(connectionString);
		connection.Open();

		using var command = connection.CreateCommand();
		command.CommandText = """
            DROP SCHEMA IF EXISTS audit CASCADE;
            DROP SCHEMA IF EXISTS identity CASCADE;
            DROP SCHEMA IF EXISTS students CASCADE;
            DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO PUBLIC;
            """;
		command.ExecuteNonQuery();
	}

	public static void RunAssembly(string connectionString, Assembly assembly)
	{
		RunScripts(connectionString, ".Migrations.", "__schema_versions", "schema migration", assembly, ScriptType.RunOnce);
		RunScripts(connectionString, ".Functions.", "__function_versions", "function deployment", assembly, ScriptType.RunAlways);
		RunScripts(connectionString, ".Seeds.", "__seed_versions", "seed", assembly, ScriptType.RunAlways);
	}

	private static void RunScripts(
		string connectionString,
		string folderMarker,
		string journalTable,
		string label,
		Assembly assembly,
		ScriptType scriptType)
	{
		var upgrader = DeployChanges.To
			.PostgresqlDatabase(connectionString)
			.JournalToPostgresqlTable("public", journalTable)
			.LogToConsole()
			.WithScriptsEmbeddedInAssembly(
				assembly,
				name => name.Contains(folderMarker),
				new SqlScriptOptions { ScriptType = scriptType })
			.Build();

		var result = upgrader.PerformUpgrade();

		if (!result.Successful)
		{
			throw new InvalidOperationException(
				$"Database {label} failed: {result.Error.Message}",
				result.Error
			);
		}
	}
}