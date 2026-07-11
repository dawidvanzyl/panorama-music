using Npgsql;
using System.Data;

namespace PanoramaMusic.Persistence.Factories;

public class NpgsqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
	public IDbConnection CreateConnection() => new NpgsqlConnection(connectionString);
}