namespace PanoramaMusic.Domain;

/// <summary>
/// Base type for an entity that owns a cluster of related state and the
/// transactional boundary around it. Follows the pull model: behaviour
/// raises events into this instance's own pending list and never calls a
/// collector, dispatcher, or logger directly — infrastructure drains the
/// pending events when the aggregate is persisted.
/// </summary>
public abstract class AggregateRoot
{
	private readonly List<IDomainEvent> _pendingEvents = [];

	protected void Raise(IDomainEvent domainEvent)
	{
		_pendingEvents.Add(domainEvent);
	}

	/// <summary>
	/// Returns the events raised since the last drain and clears the pending
	/// list.
	/// </summary>
	public IReadOnlyCollection<IDomainEvent> DrainEvents()
	{
		var events = _pendingEvents.ToArray();
		_pendingEvents.Clear();
		return events;
	}
}