using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Domain.Interfaces;

/// <summary>
/// Reads the full sibling-graph group membership for a set of students in a
/// single set-based query (never one query per student — N+1 is a defect).
/// </summary>
public interface ISiblingGroupReader
{
	Task<IReadOnlyList<SiblingGroupMembership>> ReadAsync(IReadOnlyCollection<Guid> studentIds, CancellationToken cancellationToken);
}
