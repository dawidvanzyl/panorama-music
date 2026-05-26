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

        UpgradeEngine upgrader = DeployChanges.To
            .PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(
                typeof(DatabaseMigrator).Assembly,
                name => name.Contains(".Migrations."))
            .JournalToPostgresqlTable("public", "__schema_versions")
            .LogToConsole()
            .Build();

        DatabaseUpgradeResult result = upgrader.PerformUpgrade();

        if (!result.Successful)
        {
            throw new InvalidOperationException(
                $"Database migration failed: {result.Error.Message}",
                result.Error
            );
        }
    }

    /// <summary>
    /// Drops and recreates the public schema, wiping all tables and the
    /// migration journal.  Intended for QA reset only — never call in
    /// production.
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
}
