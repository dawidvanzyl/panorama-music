using Dapper;
using System.Data;

namespace PanoramaMusic.Audit.Infrastructure.Repositories.Bases;

public abstract class RepositoryBase
{
	protected static CommandDefinition CreateCommandDefinition(string sql, object? parameters, IDbTransaction transaction, CancellationToken cancellationToken)
		=> new(sql, parameters, transaction: transaction, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
}