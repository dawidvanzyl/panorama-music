using Npgsql;
using System.Data;

namespace PanoramaMusic.Persistence.Factories;

public class NpgsqlConnectionFactory(NpgsqlDataSource dataSource) : IDbConnectionFactory
{
	public IDbConnection CreateConnection() => dataSource.CreateConnection();
}