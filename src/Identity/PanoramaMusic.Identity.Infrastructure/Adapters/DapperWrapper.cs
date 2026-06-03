using Dapper;
using PanoramaMusic.Identity.Infrastructure.Factory;
using System.Data;

namespace PanoramaMusic.Identity.Infrastructure.Adapters;

public class DapperWrapper(IDbConnectionFactory connectionFactory) : IDapperWrapper
{
	public IDbConnection CreateConnection() => connectionFactory.CreateConnection();

	public Task<T?> QuerySingleOrDefaultAsync<T>(
		IDbConnection connection,
		string sql,
		object? param = null,
		CommandType commandType = CommandType.Text,
		IDbTransaction? transaction = null)
		=> connection.QuerySingleOrDefaultAsync<T>(sql, param, transaction, commandType: commandType);

	public Task<IEnumerable<T>> QueryAsync<T>(
		IDbConnection connection,
		string sql,
		object? param = null,
		CommandType commandType = CommandType.Text,
		IDbTransaction? transaction = null)
		=> connection.QueryAsync<T>(sql, param, transaction, commandType: commandType);

	public Task ExecuteAsync(
		IDbConnection connection,
		string sql,
		object? param = null,
		CommandType commandType = CommandType.Text,
		IDbTransaction? transaction = null)
		=> connection.ExecuteAsync(sql, param, transaction, commandType: commandType);
}