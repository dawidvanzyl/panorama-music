using System.Reflection;
using Npgsql;

namespace PanoramaMusic.Infrastructure.Persistence;

/// <summary>
/// Executes seed scripts embedded under Persistence/Seeds/ against the
/// target database.  Seed scripts are always run in filename order and are
/// not journaled — they are intended to be executed only after an explicit
/// <see cref="DatabaseMigrator.Reset"/> call.
/// </summary>
public static class DatabaseSeeder
{
    public static void Run(string connectionString)
    {
        Assembly assembly = typeof(DatabaseSeeder).Assembly;

        IEnumerable<string> resourceNames = assembly
            .GetManifestResourceNames()
            .Where(name => name.Contains(".Seeds.") && name.EndsWith(".sql"))
            .OrderBy(name => name);

        using NpgsqlConnection connection = new(connectionString);
        connection.Open();

        foreach (string resourceName in resourceNames)
        {
            using Stream stream = assembly.GetManifestResourceStream(resourceName)
                ?? throw new InvalidOperationException(
                    $"Seed resource not found: {resourceName}");

            using StreamReader reader = new(stream);
            string sql = reader.ReadToEnd();

            if (string.IsNullOrWhiteSpace(sql))
            {
                continue;
            }

            using NpgsqlCommand command = connection.CreateCommand();
            command.CommandText = sql;
            command.ExecuteNonQuery();
        }
    }
}
