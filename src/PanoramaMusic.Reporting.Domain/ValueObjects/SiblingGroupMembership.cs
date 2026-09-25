namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>One student's connected-component key in the full sibling graph, with their date of birth for age ordering.</summary>
public sealed record SiblingGroupMembership(Guid StudentId, Guid GroupKey, DateOnly DateOfBirth);
