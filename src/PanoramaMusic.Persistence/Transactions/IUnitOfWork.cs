using System.Data;

namespace PanoramaMusic.Persistence.Transactions;

/// <summary>
/// Cross-context transaction boundary scoped to a single request. All
/// repositories resolved within the same scope share the one connection and
/// transaction exposed here, so writes from different bounded contexts commit
/// or roll back atomically. The transaction lifecycle is owned by the caller
/// that created the scope (the UnitOfWorkMiddleware for HTTP requests) —
/// handlers and repositories never begin, commit, or roll back directly.
/// </summary>
public interface IUnitOfWork
{
	IDbConnection Connection { get; }

	IDbTransaction Transaction { get; }

	Task BeginAsync(CancellationToken cancellationToken);

	Task CommitAsync(CancellationToken cancellationToken);

	Task RollbackAsync(CancellationToken cancellationToken);

	/// <summary>
	/// Runs <paramref name="work"/> on a fresh connection and transaction that
	/// commits independently of the ambient request transaction, then restores
	/// the ambient transaction. Use for deliberate writes that must persist even
	/// when the request fails and is rolled back (e.g. revoking a refresh-token
	/// family on replay detection before rejecting the request). Repositories
	/// participate unchanged — they see the isolated connection for the duration
	/// of the delegate.
	/// </summary>
	Task ExecuteIsolatedAsync(Func<Task> work, CancellationToken cancellationToken);
}