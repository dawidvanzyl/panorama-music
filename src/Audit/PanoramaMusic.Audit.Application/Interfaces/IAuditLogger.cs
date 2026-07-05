using PanoramaMusic.Audit.Domain.Entities;

namespace PanoramaMusic.Audit.Application.Interfaces;

public interface IAuditLogger
{
	Task LogAsync(AuditEvent auditEvent, CancellationToken cancellationToken);
}