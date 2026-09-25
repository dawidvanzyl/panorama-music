using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Extensions;

public static class ReportLayoutExtensions
{
	public static ReportRunSectionResult ToResult(this ReportLayoutSection section) =>
		new(section.StudentId, section.Rows, section.SiblingBadge?.Label);

	public static ReportRunResult ToResult(this ReportLayout layout, DateTimeOffset ranAt) => new(
		ranAt,
		layout.Sections.Count,
		[.. layout.Columns.Select(column => new ReportRunColumnResult(column.Key, column.Header))],
		[.. layout.Sections.Select(section => section.ToResult())]);
}