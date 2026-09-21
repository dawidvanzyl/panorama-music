using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Extensions;

public static class ReportLayoutExtensions
{
	public static ReportRunResult ToResult(this ReportLayout layout, DateTimeOffset ranAt) => new(
		ranAt,
		layout.Sections.Count,
		[.. layout.Columns.Select(column => new ReportRunColumnResult(column.Key, column.Header))],
		[.. layout.Sections.Select(section => new ReportRunSectionResult(section.StudentId, section.Rows))]);
}
