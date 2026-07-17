using Shouldly;
using Xunit;

namespace PanoramaMusic.Domain.Tests;

public class AggregateRootTests
{
	[Fact]
	[Trait("AC", "186UC1")]
	public void DrainEvents_AggregateHasRaisedAnEvent_ReturnsTheEventAndClearsThePendingList()
	{
		// Arrange
		var aggregate = new TestAggregate();
		var raisedEvent = new TestDomainEvent();
		aggregate.RaiseTestEvent(raisedEvent);

		// Act
		var firstDrain = aggregate.DrainEvents();
		var secondDrain = aggregate.DrainEvents();

		// Assert
		firstDrain.ShouldBe([raisedEvent]);
		secondDrain.ShouldBeEmpty();
	}

	private sealed class TestAggregate : AggregateRoot
	{
		public void RaiseTestEvent(IDomainEvent domainEvent) => Raise(domainEvent);
	}

	private sealed record TestDomainEvent : IDomainEvent;
}