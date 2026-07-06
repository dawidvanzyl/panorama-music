using PanoramaMusic.Audit.Domain.Entities;

namespace PanoramaMusic.Audit.Application.Interfaces;

public interface IAuditLogger
{
	Task CreateAsync(AuditEvent auditEvent, CancellationToken cancellationToken);
}