using Dapper;
using PanoramaMusic.Audit.Infrastructure.Factories;
using System.Data;
using System.Data.Common;

namespace PanoramaMusic.Audit.Infrastructure.Repositories.Bases;

public abstract class RepositoryBase
{
	private readonly IDbConnectionFactory _connectionFactory;

	protected RepositoryBase(IDbConnectionFactory connectionFactory)
	{
		_connectionFactory = connectionFactory;
	}

	protected DbConnection CreateConnection() => (DbConnection)_connectionFactory.CreateConnection();

	protected static CommandDefinition CreateCommandDefinition(string sql, object? parameters, CancellationToken cancellationToken)
		=> new(sql, parameters, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);

	protected static CommandDefinition CreateCommandDefinition(string sql, object? parameters, IDbTransaction transaction, CancellationToken cancellationToken)
		=> new(sql, parameters, transaction: transaction, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
}