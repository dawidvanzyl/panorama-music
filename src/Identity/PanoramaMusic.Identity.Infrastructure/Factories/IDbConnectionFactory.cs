using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Factories;

public interface IDbConnectionFactory
{
	IDbConnection CreateConnection();
}