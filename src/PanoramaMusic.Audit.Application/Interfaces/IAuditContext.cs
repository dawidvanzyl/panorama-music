namespace PanoramaMusic.Audit.Application.Interfaces;

/// <summary>
/// Request-scoped ambient data every audit event must carry. Implemented by
/// infrastructure from the active HTTP request; values fall back to safe
/// placeholders when no request is active (e.g. hosted services).
/// </summary>
public interface IAuditContext
{
	string SourceIp { get; }

	string UserAgent { get; }

	Guid CorrelationId { get; }
}