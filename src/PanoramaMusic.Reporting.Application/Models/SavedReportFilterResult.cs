namespace PanoramaMusic.Reporting.Application.Models;

public sealed record SavedReportFilterResult(string Field, string Operator, IReadOnlyList<string> Values);