namespace PanoramaMusic.Reporting.Application.Requests;

public sealed record SaveReportRequest(string Name, RunReportRequest Definition);