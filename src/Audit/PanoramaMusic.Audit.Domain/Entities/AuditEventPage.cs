namespace PanoramaMusic.Audit.Domain.Entities;

/// <summary>
/// The audit events on the requested page, alongside the total number of
/// rows matching the filter (independent of paging), returned together
/// from a single database call.
/// </summary>
public sealed record AuditEventPage(IReadOnlyList<AuditEvent> Items, int TotalCount);