using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;

namespace PanoramaMusic.Persistence.Tests.DomainEvents;

/// <summary>
/// Durable-lane translator for the test-only <see cref="TestSecurityRejected"/>
/// event — proves a security-relevant domain event's audit record survives a
/// request rollback.
/// </summary>
public sealed class TestSecurityRejectedTranslator(IAuditContext auditContext) : IAuditEventTranslator
{
	public AuditLane Lane => AuditLane.Durable;

	public bool CanTranslate(IDomainEvent domainEvent) => domainEvent is TestSecurityRejected;

	public AuditEvent Translate(IDomainEvent domainEvent)
	{
		var rejected = (TestSecurityRejected)domainEvent;

		return new AuditEvent(
			Guid.NewGuid(),
			DateTime.UtcNow,
			"test.security.rejected",
			rejected.ActorId,
			rejected.ActorEmail,
			null,
			auditContext.SourceIp,
			auditContext.UserAgent,
			auditContext.CorrelationId,
			"failure",
			rejected.Reason,
			new Dictionary<string, object?>());
	}
}