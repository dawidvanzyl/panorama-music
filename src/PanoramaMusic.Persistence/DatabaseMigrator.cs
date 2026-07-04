using DbUp;
using DbUp.Engine;
using DbUp.Support;
using Npgsql;
using System.Reflection;

namespace PanoramaMusic.Persistence;

public static class DatabaseMigrator
{
	public static void Run(string connectionString, bool ensureDatabase = false)
	{
		if (ensureDatabase)
		{
			EnsureDatabase.For.PostgresqlDatabase(connectionString);
		}
	}

	public static void Reset(string connectionString)
	{
		using NpgsqlConnection connection = new(connectionString);
		connection.Open();

		using var command = connection.CreateCommand();
		command.CommandText = """
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