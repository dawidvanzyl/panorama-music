using PanoramaMusic.Audit.Domain.Entities;

namespace PanoramaMusic.Audit.Domain.Interfaces;

/// <summary>
/// Reads the recorded history of one target record, narrowed to the event types
/// the caller cares about. Distinct from <see cref="IAuditEventReader"/>, which
/// serves the paged, filtered global audit log: an activity view for a single
/// record is bounded by that record's own history and is not paged.
/// <para>
/// Deliberately generic — the Audit context knows nothing of what it is holding
/// the history of, so the caller names its own event types.
/// </para>
/// </summary>
public interface IAuditActivityReader
{
	/// <summary>Newest first.</summary>
	Task<IList<AuditEvent>> GetForTargetAsync(
		Guid targetId,
		IReadOnlyCollection<string> eventTypes,
		CancellationToken cancellationToken);
}