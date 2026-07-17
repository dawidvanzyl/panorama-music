using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Domain;
using PanoramaMusic.Persistence.Interfaces;

namespace PanoramaMusic.Audit.Infrastructure.Services;

/// <summary>
/// Request-scoped in-memory accumulator. Registered scoped so every
/// repository resolved within one request shares the same instance.
/// </summary>
public sealed class DomainEventCollector : IDomainEventCollector
{
	private readonly List<IDomainEvent> _events = [];

	public void Collect(AggregateRoot aggregate)
	{
		_events.AddRange(aggregate.DrainEvents());
	}

	public IReadOnlyCollection<IDomainEvent> DrainAll()
	{
		var events = _events.ToArray();
		_events.Clear();
		return events;
	}
}