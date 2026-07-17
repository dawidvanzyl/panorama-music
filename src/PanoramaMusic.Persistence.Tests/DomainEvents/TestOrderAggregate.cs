using PanoramaMusic.Domain;

namespace PanoramaMusic.Persistence.Tests.DomainEvents;

/// <summary>
/// A minimal aggregate used only to exercise the domain-event audit pipeline
/// end-to-end (collect → translate → flush) without depending on a real
/// bounded context's entities.
/// </summary>
public sealed class TestOrderAggregate : AggregateRoot
{
	public void PlaceOrder(Guid actorId, string actorEmail)
	{
		Raise(new TestOrderPlaced(actorId, actorEmail));
	}

	public void RejectSecurityCheck(Guid actorId, string actorEmail, string reason)
	{
		Raise(new TestSecurityRejected(actorId, actorEmail, reason));
	}
}

public sealed record TestOrderPlaced(Guid ActorId, string ActorEmail) : IDomainEvent;

public sealed record TestSecurityRejected(Guid ActorId, string ActorEmail, string Reason) : IDomainEvent;