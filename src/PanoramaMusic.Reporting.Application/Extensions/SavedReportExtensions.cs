using PanoramaMusic.Reporting.Application.Models;
using PanoramaMusic.Reporting.Domain.Messages;
using PanoramaMusic.Reporting.Domain.ValueObjects;

namespace PanoramaMusic.Reporting.Application.Extensions;

public static class SavedReportExtensions
{
	public static SavedReportResult ToResult(this SavedReportRecord record, Guid? currentUserId) => new(
		record.Report.SavedReportId,
		record.Report.Name,
		record.CreatorEmail ?? SavedReportMessages.RemovedCreator,
		record.Report.CreatedAt,
		record.Report.LastRunAt,
		record.Report.CreatedBy == currentUserId);

	public static SavedReportSummaryResult ToSummaryResult(this SavedReportRecord record, Guid? currentUserId) => new(
		record.Report.SavedReportId,
		record.Report.Name,
		record.CreatorEmail ?? SavedReportMessages.RemovedCreator,
		record.Report.LastRunAt,
		record.Report.CreatedBy == currentUserId);

	public static SavedReportDetailResult ToDetailResult(this SavedReportRecord record, Guid? currentUserId) => new(
		record.Report.SavedReportId,
		record.Report.Name,
		record.CreatorEmail ?? SavedReportMessages.RemovedCreator,
		record.Report.LastRunAt,
		record.Report.CreatedBy == currentUserId,
		new SavedReportDefinitionResult(
			[.. record.Report.Definition.Filters.Select(filter => new SavedReportFilterResult(filter.Field, filter.Operator, filter.Values))],
			record.Report.Definition.Columns));
}
