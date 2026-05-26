using DbUp;
using DbUp.Engine;
using Npgsql;

namespace PanoramaMusic.Infrastructure.Persistence;

public static class DatabaseMigrator
{
    public static void Run(string connectionString, bool ensureDatabase = false)
    {
        if (ensureDatabase)
        {
            EnsureDatabase.For.PostgresqlDatabase(connectionString);
        }

        RunScripts(connectionString, ".Migrations.", "__schema_versions", "schema migration");
        RunScripts(connectionString, ".Functions.", "__function_versions", "function deployment");
        RunScripts(connectionString, ".Seeds.", "__seed_versions", "seed");
    }

    /// <summary>
    /// Drops and recreates the public schema, wiping all tables, functions,
    /// seeds, and migration journals. Intended for QA reset only — never call
    /// in production.
    /// </summary>
    public static void Reset(string connectionString)
    {
        using NpgsqlConnection connection = new(connectionString);
        connection.Open();

        using NpgsqlCommand command = connection.CreateCommand();
        command.CommandText = """
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
        string label)
    {
        UpgradeEngine upgrader = DeployChanges.To
            .PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(
                typeof(DatabaseMigrator).Assembly,
                name => name.Contains(folderMarker))
            .JournalToPostgresqlTable("public", journalTable)
            .LogToConsole()
            .Build();

        DatabaseUpgradeResult result = upgrader.PerformUpgrade();

        if (!result.Successful)
        {
            throw new InvalidOperationException(
                $"Database {label} failed: {result.Error.Message}",
                result.Error
            );
        }
    }
}
