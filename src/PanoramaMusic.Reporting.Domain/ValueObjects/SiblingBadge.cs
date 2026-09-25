namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>A student's position among their sibling group's present members: their group's number and their age-ordered ordinal within it.</summary>
public sealed record SiblingBadge(int Group, int Ordinal)
{
	public string Label => $"{Group}.{Ordinal}";
}
