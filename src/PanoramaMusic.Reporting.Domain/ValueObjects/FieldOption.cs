namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>One selectable value for a list or boolean filter attribute.</summary>
public sealed record FieldOption(string Value, string Label);