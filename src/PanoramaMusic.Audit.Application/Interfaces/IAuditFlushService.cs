namespace PanoramaMusic.Audit.Application.Interfaces;

/// <summary>
/// Drains the request-scoped <see cref="IDomainEventCollector"/> and writes
/// the translated audit records, invoked by <c>UnitOfWorkMiddleware</c>.
/// </summary>
public interface IAuditFlushService
{
	/// <summary>
	/// Called immediately before commit on a successful request. Writes
	/// transactional-lane records on the ambient connection (so they commit
	/// with the business write) and durable-lane records on an isolated
	/// connection.
	/// </summary>
	Task FlushAsync(CancellationToken cancellationToken);

	/// <summary>
	/// Called immediately before rollback on a failed request. Writes only
	/// durable-lane records, on an isolated connection that survives the
	/// rollback; transactional-lane records are discarded since the write
	/// they describe never persisted.
	/// </summary>
	Task FlushDurableAsync(CancellationToken cancellationToken);
}