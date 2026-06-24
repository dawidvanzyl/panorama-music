using DbUp;
using Npgsql;
using System.Reflection;

namespace PanoramaMusic.Infrastructure.Persistence;

public static class DatabaseMigrator
{
	public static void Run(string connectionString, bool ensureDatabase = false, params Assembly[] additionalAssemblies)
	{
		if (ensureDatabase)
		{
			EnsureDatabase.For.PostgresqlDatabase(connectionString);
		}

		var assemblies = new[] { typeof(DatabaseMigrator).Assembly }
			.Concat(additionalAssemblies)
			.ToArray();

		RunScripts(connectionString, ".Migrations.", "__schema_versions", "schema migration", assemblies);
		RunScripts(connectionString, ".Functions.", "__function_versions", "function deployment", assemblies);
		RunScripts(connectionString, ".Seeds.", "__seed_versions", "seed", assemblies);
	}

	public static void Reset(string connectionString)
	{
		using NpgsqlConnection connection = new(connectionString);
		connection.Open();

		using var command = connection.CreateCommand();
		command.CommandText = """
            DROP SCHEMA IF EXISTS identity CASCADE;
            DROP SCHEMA IF EXISTS tables CASCADE;
            DROP SCHEMA IF EXISTS funcs CASCADE;
            DROP SCHEMA public CASCADE;
            CREATE SCHEMA public;
            GRANT ALL ON SCHEMA public TO PUBLIC;
            """;
		command.ExecuteNonQuery();
	}

	private static void RunScripts(
		string connectionString,
		string folderMarker,
		string journalTable,
		string label,
		Assembly[] assemblies)
	{
		var upgraderBuilder = DeployChanges.To
			.PostgresqlDatabase(connectionString)
			.JournalToPostgresqlTable("public", journalTable)
			.LogToConsole();

		foreach (var assembly in assemblies)
		{
			upgraderBuilder = upgraderBuilder.WithScriptsEmbeddedInAssembly(
				assembly,
				name => name.Contains(folderMarker));
		}

		var upgrader = upgraderBuilder.Build();
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