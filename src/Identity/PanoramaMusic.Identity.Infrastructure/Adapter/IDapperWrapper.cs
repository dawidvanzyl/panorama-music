using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Adapter;

public interface IDapperWrapper
{
    IDbConnection CreateConnection();

    Task<T?> QuerySingleOrDefaultAsync<T>(
        IDbConnection connection,
        string sql,
        object? param = null,
        CommandType commandType = CommandType.Text,
        IDbTransaction? transaction = null);

    Task<IEnumerable<T>> QueryAsync<T>(
        IDbConnection connection,
        string sql,
        object? param = null,
        CommandType commandType = CommandType.Text,
        IDbTransaction? transaction = null);

    Task ExecuteAsync(
        IDbConnection connection,
        string sql,
        object? param = null,
        CommandType commandType = CommandType.Text,
        IDbTransaction? transaction = null);
}
