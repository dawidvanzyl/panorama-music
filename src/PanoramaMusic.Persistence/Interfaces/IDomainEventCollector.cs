using PanoramaMusic.Domain;

namespace PanoramaMusic.Persistence.Interfaces;

/// <summary>
/// Request-scoped accumulator for domain events drained from aggregates as
/// they are persisted. Repositories/the unit of work call <see cref="Collect"/>
/// with the aggregate being saved; the audit flush drains everything
/// collected during the request via <see cref="DrainAll"/>.
/// </summary>
public interface IDomainEventCollector
{
	void Collect(AggregateRoot aggregate);

	IReadOnlyCollection<IDomainEvent> DrainAll();
}