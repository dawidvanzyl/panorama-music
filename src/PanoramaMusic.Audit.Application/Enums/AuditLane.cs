namespace PanoramaMusic.Audit.Application.Enums;

/// <summary>
/// Routes a translated audit record to the connection it must be written on.
/// </summary>
public enum AuditLane
{
	/// <summary>
	/// Written on the ambient request transaction immediately before commit —
	/// if the request rolls back, the audit record rolls back with it.
	/// </summary>
	Transactional,

	/// <summary>
	/// Written on an independent connection that commits regardless of the
	/// request outcome. Reserved for security events that must survive a
	/// rejected request.
	/// </summary>
	Durable,
}