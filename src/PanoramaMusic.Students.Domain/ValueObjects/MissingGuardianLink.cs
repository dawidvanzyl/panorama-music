namespace PanoramaMusic.Students.Domain.ValueObjects;

/// <summary>
/// One link that does not exist yet: a student who should hold a guardian and
/// does not. Answers "what is missing" as a set, so a family can be brought into
/// line without asking after each member in turn.
/// </summary>
public sealed record MissingGuardianLink(Guid StudentId, Guid GuardianId);
