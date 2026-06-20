using Npgsql;
using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Factories;

public class NpgsqlConnectionFactory(string connectionString) : IDbConnectionFactory
{
	public IDbConnection CreateConnection() => new NpgsqlConnection(connectionString);
}