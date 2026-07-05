using System.Data;

namespace PanoramaMusic.Audit.Infrastructure.Factories;

public interface IDbConnectionFactory
{
	IDbConnection CreateConnection();
}