namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>The WHERE-clause text a predicate builder produced, and whether it needs the sibling-stats CTE.</summary>
public sealed record PredicateFragment(string Sql, bool RequiresSiblingStats);