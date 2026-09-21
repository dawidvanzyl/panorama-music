namespace PanoramaMusic.Reporting.Application.Requests;

/// <summary>
/// The operator stays a string here, parsed case-sensitively against
/// <c>equals</c>/<c>contains</c>/<c>in</c> inside <c>ReportDefinition.Create</c>.
/// Binding it to an enum would let <c>JsonStringEnumConverter</c> accept
/// integers and other casings, widening what the client can send past the
/// registry allowlist this contract exists to enforce.
/// </summary>
public sealed record ReportFilterRequest(string Field, string Operator, IList<string> Values);

public sealed record RunReportRequest(IList<ReportFilterRequest> Filters, IList<string> Columns);
