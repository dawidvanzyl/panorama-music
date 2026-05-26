using DbUp;
using DbUp.Engine;

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
            .WithScriptsEmbeddedInAssembly(typeof(DatabaseMigrator).Assembly)
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
}
