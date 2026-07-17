using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;

namespace PanoramaMusic.Persistence.Tests.DomainEvents;

/// <summary>
/// Transactional-lane translator for the test-only <see cref="TestOrderPlaced"/>
/// event — proves a request-scoped domain event produces an audit record that
/// commits atomically with the business write.
/// </summary>
public sealed class TestOrderPlacedTranslator(IAuditContext auditContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Transactional;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is TestOrderPlaced;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var orderPlaced = (TestOrderPlaced)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			"test.order.placed",
			orderPlaced.ActorId,
			orderPlaced.ActorEmail,
			null,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"success",
			null,
			new Dictionary<string, object?>());
	}
}