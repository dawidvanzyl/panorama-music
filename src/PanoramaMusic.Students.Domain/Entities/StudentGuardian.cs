namespace PanoramaMusic.Students.Domain.Entities;

/// <summary>
/// Join concept relating a student to a guardian. Shape only for this story —
/// guardian records, the repository, and the endpoint that populates this join
/// arrive with the Guardians milestone (#6).
/// </summary>
public sealed record StudentGuardian(Guid StudentGuardianId, Guid StudentId, Guid GuardianId, Guid GuardianRelationshipId);