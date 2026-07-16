using PanoramaMusic.Audit.Domain.Entities;

namespace PanoramaMusic.Audit.Domain.Interfaces;

public interface IAuditEventReader
{
	Task<AuditEventPage> GetPagedAsync(AuditEventFilter filter, CancellationToken cancellationToken);
}