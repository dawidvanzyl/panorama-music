namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>A collection's FROM/JOIN clause and its join back to the population's student row.</summary>
internal sealed record CollectionScope(string From, string StudentJoin);