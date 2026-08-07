namespace PanoramaMusic.Teachers.Domain.ValueObjects;

/// <summary>
/// A login account that may be linked to a teacher: it holds the Teacher role
/// and is not already linked. Eligibility is decided where the set is produced,
/// so anything of this type is by definition offerable.
/// </summary>
public sealed record LinkableAccount(Guid AccountId, string Email);