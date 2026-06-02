using System.Data;
using Npgsql;

namespace PanoramaMusic.Identity.Infrastructure.Data;

public class NpgsqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
    public IDbConnection CreateConnection() => new NpgsqlConnection(connectionString);
}
