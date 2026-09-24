using PanoramaMusic.Reporting.Domain.Enums;

namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>One filter row: a field key, an operator and its values, exactly as requested.</summary>
public sealed record ReportFilter(string Field, FilterOperator Operator, IReadOnlyList<string> Values);