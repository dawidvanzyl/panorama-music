namespace PanoramaMusic.Reporting.Application.Requests;

public sealed record RunReportRequest(IList<ReportFilterRequest> Filters, IList<string> Columns);