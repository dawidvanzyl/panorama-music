namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// One student in the population query's result, in the order the query
/// returned it (317UC13), carrying the raw source values of every selected
/// Student-collection column.
/// </summary>
public sealed record PopulationMember(Guid StudentId, SourceValues Sources);
