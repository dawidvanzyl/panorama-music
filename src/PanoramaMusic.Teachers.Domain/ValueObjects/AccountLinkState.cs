namespace PanoramaMusic.Teachers.Domain.ValueObjects;

/// <summary>
/// What the Teachers context needs to know about a login account before it will
/// link to it: its email, whether it holds the Teacher role, and whether some
/// teacher already claims it. All three are read in one pass so the eligibility
/// decision never costs more than a single round trip.
/// </summary>
public sealed record AccountLinkState(string Email, bool HasTeacherRole, bool IsLinked);