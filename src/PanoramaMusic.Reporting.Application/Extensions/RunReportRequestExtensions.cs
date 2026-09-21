using PanoramaMusic.Reporting.Application.Requests;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Extensions;

public static class RunReportRequestExtensions
{
	public static IReadOnlyList<ReportFilterInput> ToFilterInputs(this RunReportRequest request) =>
		[.. request.Filters.Select(filter => new ReportFilterInput(filter.Field, filter.Operator, [.. filter.Values]))];
}
