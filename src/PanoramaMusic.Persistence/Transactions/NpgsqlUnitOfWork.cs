using PanoramaMusic.Persistence.Factories;
using System.Data;
using System.Data.Common;

namespace PanoramaMusic.Persistence.Transactions;

public sealed class NpgsqlUnitOfWork(IDbConnectionFactory connectionFactory) : IUnitOfWork, IAsyncDisposable, IDisposable
{
	private DbConnection? _connection;
	private DbTransaction? _transaction;

	public IDbConnection Connection => _connection
		?? throw new InvalidOperationException("The unit of work has not been started. Call BeginAsync first.");

	public IDbTransaction Transaction => _transaction
		?? throw new InvalidOperationException("The unit of work has no active transaction. Call BeginAsync first.");

	public async Task BeginAsync(CancellationToken cancellationToken)
	{
		if (_transaction is not null)
			throw new InvalidOperationException("The unit of work has already been started.");

		_connection = (DbConnection)connectionFactory.CreateConnection();
		await _connection.OpenAsync(cancellationToken);
		_transaction = await _connection.BeginTransactionAsync(cancellationToken);
	}

	public async Task CommitAsync(CancellationToken cancellationToken)
	{
		if (_transaction is null)
			throw new InvalidOperationException("The unit of work has no active transaction to commit.");

		await _transaction.CommitAsync(cancellationToken);
		await CleanUpAsync();
	}

	public async Task RollbackAsync(CancellationToken cancellationToken)
	{
		if (_transaction is null)
			throw new InvalidOperationException("The unit of work has no active transaction to roll back.");

		await _transaction.RollbackAsync(cancellationToken);
		await CleanUpAsync();
	}

	public async Task ExecuteIsolatedAsync(Func<Task> work, CancellationToken cancellationToken)
	{
		// Swap in a fresh connection/transaction so repositories resolved from
		// this scope transparently write outside the ambient transaction, then
		// restore the ambient one. Not safe for parallel awaits within one
		// scope — the swap is visible to everything sharing this instance.
		var ambientConnection = _connection;
		var ambientTransaction = _transaction;

		// Cleared before the swap so a failure while opening the isolated
		// connection can never roll back or dispose the ambient transaction.
		_transaction = null;
		_connection = (DbConnection)connectionFactory.CreateConnection();
		try
		{
			await _connection.OpenAsync(cancellationToken);
			_transaction = await _connection.BeginTransactionAsync(cancellationToken);

			await work();
			await _transaction.CommitAsync(cancellationToken);
		}
		catch
		{
			if (_transaction is not null)
				await _transaction.RollbackAsync(CancellationToken.None);
			throw;
		}
		finally
		{
			if (_transaction is not null)
				await _transaction.DisposeAsync();
			await _connection.DisposeAsync();
			_connection = ambientConnection;
			_transaction = ambientTransaction;
		}
	}

	public async ValueTask DisposeAsync()
	{
		// An undisposed transaction here means neither CommitAsync nor
		// RollbackAsync ran; disposing rolls the transaction back.
		await CleanUpAsync();
	}

	// Synchronous counterpart for scopes disposed via IDisposable (e.g. test
	// code using CreateScope) — same roll-back-on-dispose semantics.
	public void Dispose()
	{
		_transaction?.Dispose();
		_transaction = null;
		_connection?.Dispose();
		_connection = null;
	}

	private async Task CleanUpAsync()
	{
		if (_transaction is not null)
		{
			await _transaction.DisposeAsync();
			_transaction = null;
		}

		if (_connection is not null)
		{
			await _connection.DisposeAsync();
			_connection = null;
		}
	}
}