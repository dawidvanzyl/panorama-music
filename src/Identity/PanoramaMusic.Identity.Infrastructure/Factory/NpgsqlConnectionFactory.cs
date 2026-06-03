using Npgsql;
using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Factory;

public class NpgsqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
	public IDbConnection CreateConnection() => new NpgsqlConnection(connectionString);
}