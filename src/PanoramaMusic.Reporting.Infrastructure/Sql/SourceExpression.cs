namespace PanoramaMusic.Reporting.Infrastructure.Sql;

/// <summary>
/// One logical source's SQL half: the select expression the population query
/// emits for it, and whether reaching it needs the sibling-stats CTE joined
/// in. Every expression here is a fixed, hand-written fragment — never built
/// from a request value.
/// </summary>
public sealed record SourceExpression(string SelectExpression, bool RequiresSiblingStats);