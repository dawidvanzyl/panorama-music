using PanoramaMusic.Audit.Application.Enums;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Domain;

namespace PanoramaMusic.Audit.Application.Interfaces;

/// <summary>
/// Maps a domain event raised by a producing context to an <see cref="AuditEvent"/>,
/// enriched with ambient request context. The producing context never
/// constructs an <see cref="AuditEvent"/> itself — only a translator owned by
/// the Audit context does.
/// </summary>
public interface IAuditEventTranslator
{
	AuditLane Lane { get; }

	bool CanTranslate(IDomainEvent domainEvent);

	AuditEvent Translate(IDomainEvent domainEvent);
}