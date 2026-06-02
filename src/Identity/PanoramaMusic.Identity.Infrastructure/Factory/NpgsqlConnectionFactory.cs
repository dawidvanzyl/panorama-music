using System.Data;
using Npgsql;

namespace PanoramaMusic.Identity.Infrastructure.Factory;

public class NpgsqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
    public IDbConnection CreateConnection() => new NpgsqlConnection(connectionString);
}
