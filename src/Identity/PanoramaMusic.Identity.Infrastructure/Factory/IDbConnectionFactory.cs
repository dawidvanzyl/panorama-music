using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Factory;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}
