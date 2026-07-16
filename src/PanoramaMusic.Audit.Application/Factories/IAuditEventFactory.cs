using PanoramaMusic.Audit.Domain.Entities;

namespace PanoramaMusic.Audit.Application.Factories;

/// <summary>
/// Builds fully populated <see cref="AuditEvent"/> records, filling id,
/// occurred-at, source ip, user agent, and correlation id from the ambient
/// request so emitting handlers only supply the event-specific fields.
/// </summary>
public interface IAuditEventFactory
{
	AuditEvent Create(
		string eventType,
		Guid? actorId,
		string? actorEmail,
		Guid? targetId,
		string outcome,
		string? reason = null,
		IReadOnlyDictionary<string, object?>? detail = null);
}