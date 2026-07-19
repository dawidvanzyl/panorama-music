using Dapper;
using PanoramaMusic.Persistence.Transactions;
using System.Data;

namespace PanoramaMusic.Students.Infrastructure.Repositories.Bases;

public abstract class RepositoryBase(IUnitOfWork unitOfWork)
{
	protected IDbConnection Connection => unitOfWork.Connection;

	protected IDbTransaction Transaction => unitOfWork.Transaction;

	protected static CommandDefinition CreateCommandDefinition(string sql, object? parameters, IDbTransaction transaction, CancellationToken cancellationToken)
		=> new(sql, parameters, transaction: transaction, commandType: CommandType.StoredProcedure, cancellationToken: cancellationToken);
}