namespace PanoramaMusic.Reporting.Domain.ValueObjects;

/// <summary>
/// A filter row exactly as the caller sent it, before validation. The operator
/// stays a string here — parsing it against the registry's known operators
/// (case-sensitively: <c>equals</c>/<c>contains</c>/<c>in</c>) is one of
/// <c>ReportDefinition.Create</c>'s checks, not a binding step that would
/// silently coerce an unrecognised value.
/// </summary>
public sealed record ReportFilterInput(string Field, string Operator, IReadOnlyList<string> Values);