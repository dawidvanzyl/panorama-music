using PanoramaMusic.Audit.Domain.Entities;

namespace PanoramaMusic.Audit.Domain.Interfaces;

public interface IAuditLogger
{
	Task CreateAsync(AuditEvent auditEvent, CancellationToken cancellationToken);
}