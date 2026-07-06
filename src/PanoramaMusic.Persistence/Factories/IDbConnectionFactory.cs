using System.Data;

namespace PanoramaMusic.Persistence.Factories;

public interface IDbConnectionFactory
{
	IDbConnection CreateConnection();
}