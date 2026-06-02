using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Data;

public interface IDbConnectionFactory
{
    IDbConnection CreateConnection();
}
